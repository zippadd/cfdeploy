const yaml = require('js-yaml')
const fs = require('fs-extra')
const path = require('path')
const os = require('os')
const { URL } = require('url')
const { uploadS3, modes } = require('../utilities/uploadS3.js')
const { getCloudformationYAMLSchema, getTagClasses } = require('../utilities/getCloudformationYAMLSchema.js')
// const { getAWSCurrentAccountId, getAWSCurrentOrDefaultRegion } = require('../utilities/awsUtils.js')

const isS3URL = (urlOrPath) => {
  return urlOrPath.match(/^s3:\/\/.*/)
}

const isURL = (urlOrPath) => {
  try {
    const url = new URL(urlOrPath)
    url.toString() // Include to silence warning and make sure not null
  } catch (err) {
    return false
  }

  return true
}

const uploadToS3Targets = async (targets, localPath, s3BucketBase, s3Prefix, options) => {
  const s3UploadPromises = []

  for (const targetAccount of Object.keys(targets)) {
    for (const targetRegion of Object.keys(targets[targetAccount])) {
      const s3Bucket = `${s3BucketBase}-${targetRegion}-${targetAccount}`
      s3UploadPromises.push(uploadS3(localPath, s3Bucket, s3Prefix, options))
    }
  }

  const { url, s3URL, bucket, key } = (await Promise.all(s3UploadPromises))[0]

  // Exmaple: !Sub "arn:${AWS::Partition}:appsync:${AWS::Region}:${AWS::AccountId}:apis/*"
  const tagClasses = getTagClasses()
  const genericBucketName = `${s3BucketBase}-\${AWS::Region}-\${AWS::AccountId}`
  const genericBucket = new tagClasses.Sub('!Sub', genericBucketName)
  const genericS3URL = new tagClasses.Sub('!Sub', s3URL.replace(bucket, genericBucketName))
  const genericURL = new tagClasses.Sub('!Sub', url.replace(bucket, genericBucketName))

  return { url: genericURL, s3URL: genericS3URL, bucket: genericBucket, key }
}

const processResource = async (resource, resourceName, s3BucketBase, s3Prefix, targets, yamlDocMap) => {
  const { Type, Properties } = resource

  if (!Type || !Properties) {
    throw new Error(`Invalid Cloudformation resource: ${resourceName}. Missing Type or Properties.`)
  }
  /* Supported types to currently match Cloudformation package command
     https://docs.aws.amazon.com/cli/latest/reference/cloudformation/package.html

     Exceptions:
     AWS::Serverless::Function - transforms/macros are not suported on StackSets today
     AWS::Serverless::Api - transforms/macros are not suported on StackSets today
     AWS::Import - macros are not suported on StackSets today
  */
  const typeSplit = Type.split('::')
  const s3PathAppend = `${typeSplit[1]}/${typeSplit[2]}/${resourceName}`.toLocaleLowerCase()
  const s3CalcPrefix = `${s3Prefix}/${s3PathAppend}`
  switch (Type) {
    case 'AWS::ApiGateway::RestApi': {
      const { BodyS3Location } = Properties

      /* Skip this resource if an object (or other non-string/null) is present as we only process paths */
      if (!(typeof BodyS3Location === 'string' || BodyS3Location instanceof String)) {
        break
      }

      const { bucket, key } = await uploadToS3Targets(targets, BodyS3Location, s3BucketBase, s3CalcPrefix, {
        hashVersioning: true
      })

      Properties.BodyS3Location = {
        Bucket: bucket,
        Key: key
      }
      break
    }
    case 'AWS::Lambda::Function': {
      const { Code } = Properties

      if (!Code) {
        throw new Error('Code is a required property for Lambda Cloudformation resources')
      }

      /* Skip this resource if an object (or other non-string) is present as we only process paths */
      if (!(typeof Code === 'string' || Code instanceof String)) {
        break
      }

      const { bucket, key } = await uploadToS3Targets(targets, Code, s3BucketBase, s3CalcPrefix, {
        mode: modes.archive,
        hashVersioning: true
      })
      Properties.Code = {
        S3Bucket: bucket,
        S3Key: key
      }
      break
    }
    // not supported in StackSets
    /*
    case 'AWS::Serverless::Function': {
      console.log('Not implemented')
      break
    } */
    case 'AWS::AppSync::GraphQLSchema': {
      const { DefinitionS3Location } = Properties

      if (!DefinitionS3Location || isS3URL(DefinitionS3Location)) {
        break
      }

      const { s3URL } = await uploadToS3Targets(targets, DefinitionS3Location, s3BucketBase, s3CalcPrefix, {
        hashVersioning: true
      })

      Properties.DefinitionS3Location = s3URL
      break
    }
    case 'AWS::AppSync::Resolver': {
      const { RequestMappingTemplateS3Location, ResponseMappingTemplateS3Location } = Properties

      if (RequestMappingTemplateS3Location && !isS3URL(RequestMappingTemplateS3Location)) {
        const { s3URL } = await uploadToS3Targets(targets, RequestMappingTemplateS3Location, s3BucketBase, s3CalcPrefix, {
          hashVersioning: true
        })

        Properties.RequestMappingTemplateS3Location = s3URL
      }

      if (ResponseMappingTemplateS3Location && !isS3URL(ResponseMappingTemplateS3Location)) {
        const { s3URL } = await uploadToS3Targets(targets, ResponseMappingTemplateS3Location, s3BucketBase, s3CalcPrefix, {
          hashVersioning: true
        })

        Properties.ResponseMappingTemplateS3Location = s3URL
      }
      break
    }
    // not supported in StackSets
    /*
    case 'AWS::Serverless::Api': {
      console.log('Not implemented')
      break
    } */
    // not supported in StackSets
    /*
    case 'AWS::Include': {
      console.log('Not implemented')
      break
    } */
    case 'AWS::ElasticBeanstalk::ApplicationVersion': {
      const { SourceBundle } = Properties

      if (!SourceBundle) {
        throw new Error('SourceBundle is a required property for Elastic Beanstalk Cloudformation resources')
      }

      if (!(typeof SourceBundle === 'string' || SourceBundle instanceof String)) {
        break
      }

      const { bucket, key } = await uploadToS3Targets(targets, SourceBundle, s3BucketBase, s3CalcPrefix, {
        mode: modes.archive,
        hashVersioning: true
      })
      Properties.SourceBundle = {
        S3Bucket: bucket,
        S3Key: key
      }
      break
    }
    case 'AWS::CloudFormation::Stack': {
      const { TemplateURL } = Properties

      if (!TemplateURL) {
        throw new Error('TemplateURL is a required property for Cloudformation Stack Cloudformation resources')
      }

      if (isURL(TemplateURL)) {
        /* TODO: Process that template even if in S3 already */
        break
      }

      const resourceFormatted = `_${resourceName.toLocaleLowerCase()}`
      const s3PrefixExtended = s3Prefix ? `${s3Prefix}/${resourceFormatted}` : resourceFormatted
      const { url, yamlDocMap: receivedMap } = await processArtifactUpload(TemplateURL, s3BucketBase, s3PrefixExtended, targets)

      yamlDocMap[resourceFormatted] = receivedMap

      Properties.TemplateURL = url
      break
    }
    case 'AWS::Glue::Job': {
      const { Command: { ScriptLocation } } = Properties

      if (!ScriptLocation || isS3URL(ScriptLocation)) {
        break
      }

      const { s3URL } = await uploadToS3Targets(targets, ScriptLocation, s3BucketBase, s3CalcPrefix, {
        hashVersioning: true
      })

      Properties.Command.ScriptLocation = s3URL
      break
    }
    default:
      /* Doesn't match any supported types known to have S3 artifact references */
  }
}

const processResources = async (resources, s3BucketBase, s3Prefix, targets, yamlDocMap) => {
  const resourceProcessingPromises = []

  for (const resource of Object.keys(resources)) {
    resourceProcessingPromises.push(processResource(resources[resource], resource, s3BucketBase, s3Prefix, targets, yamlDocMap))
  }

  return Promise.all(resourceProcessingPromises)
}

const processArtifactUpload = async (templatePath, s3BucketBase, s3Prefix, targets) => {
  const absFilePath = path.isAbsolute(templatePath) ? templatePath : path.join(process.cwd(), templatePath)
  const file = await fs.readFile(absFilePath, 'utf-8')
  const cfSchema = getCloudformationYAMLSchema()
  let yamlDoc
  const yamlDocMap = {}
  try {
    yamlDoc = yaml.load(file, { schema: cfSchema })
  } catch (err) {
    console.log(err)
    throw new Error('Error parsing the template file YAML')
  }

  await processResources(yamlDoc.Resources, s3BucketBase, s3Prefix, targets, yamlDocMap)

  const yamlFile = yaml.dump(yamlDoc, { schema: cfSchema })
  const yamlFilePath = path.join(os.tmpdir(), path.basename(templatePath))
  await fs.writeFile(yamlFilePath, yamlFile)
  const { url, s3URL } = await uploadToS3Targets(targets, yamlFilePath, s3BucketBase, s3Prefix)

  yamlDocMap.doc = yamlDoc

  return { url, s3URL, yamlDocMap, yamlFilePath }
}

const artifactUpload = async (templatePath, adminS3Bucket, adminS3Prefix, targetsS3BucketBase, targetsS3Prefix, targets) => {
  const { yamlDocMap, yamlFilePath } = await processArtifactUpload(templatePath, targetsS3BucketBase, targetsS3Prefix, targets)
  const { url, s3URL } = await uploadS3(yamlFilePath, adminS3Bucket, adminS3Prefix)
  return { url, s3URL, yamlDocMap }
}

module.exports = {
  artifactUpload
}
