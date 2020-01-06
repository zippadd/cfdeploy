/* eslint-env jest */
const path = require('path')
const crypto = require('crypto')
const AWS = require('aws-sdk-mock')
const AWS_SDK = require('aws-sdk')
AWS.setSDKInstance(AWS_SDK)
const { getTagClasses } = require('../utilities/getCloudformationYAMLSchema.js')

const tagClasses = getTagClasses()

const stackSetName = 'test-stacksets'
const stackSetBucket = `${stackSetName}-admin`
const defaultBucketName = `${stackSetName}-\${AWS::Region}-\${AWS::AccountId}`

const blake2Support = crypto.getHashes().includes('blake2s256')

const exampleAPIGHash = blake2Support
  ? '58a4d68a85b629f9c6998235b712bfc92e5c263ad55ad85cd78bbd50b230c734'
  : '7a4044f03e5a81b584f36f33493b885c12cc56837853ff2243e9105f91d23179'
const exampleReqMapHash = blake2Support
  ? '5102f6c4ea402366aa8ce156a50ab5af28b4c452a80b423442b18b312e7bacb1'
  : '11141313fc2f5b92e8432c22cab4af9aa26a7c019559df311d8c5584a33c6d3f'
const exampleResMapHash = blake2Support
  ? 'a0e14b00adaee553932d81d51006af614e2cc3673d190c17c1c7776ae2046a16'
  : 'ab69f2706d9d99b192e66c6d21e4991121923239858099d329a9a5a8a86ba4f3'
const exampleGQLSchemaHash = blake2Support
  ? 'e79ff19122806abb64cbabdc4a1c22218081d4985436555c325fbf41577ba55e'
  : '0187f288c108c1c9ba0d441e8efaa4af69622f52d7078b92049cb988e0e0d0d1'
const exampleEBSKVerHash = blake2Support
  ? '45aefb65689642d2cb7f4bfcbc78f188e9a4caff20514fd0b3137cbc12ef7237'
  : 'b47b7a276a69c6b81e0ade141fc2e3f42925d0c26eaba1742600623f134e196f'
const exampleLambdaHash = blake2Support
  ? '45aefb65689642d2cb7f4bfcbc78f188e9a4caff20514fd0b3137cbc12ef7237'
  : 'b47b7a276a69c6b81e0ade141fc2e3f42925d0c26eaba1742600623f134e196f'
const exampleGlueJobHash = blake2Support
  ? '69217a3079908094e11121d042354a7c1f55b6482ca1a51e1b250dfd1ed0eef9'
  : 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
const exampleLambdaHash2 = blake2Support
  ? '45aefb65689642d2cb7f4bfcbc78f188e9a4caff20514fd0b3137cbc12ef7237'
  : 'b47b7a276a69c6b81e0ade141fc2e3f42925d0c26eaba1742600623f134e196f'
const exampleTemplateHash = blake2Support
  ? '6d9ab99746f0a50803a5aba7e4663fcbe0d3be1128b0f80427dd2c312ea8d73e'
  : '0f65e6c79dea567ef52613658e86567b7ddb56b0723fe5fd15c9f237509ea7a2'
const exampleTemplateNestedHash = blake2Support
  ? '77e227c5f68223e9969d09c1c873bfff3a7fee9b7b550475969e03dc19c8aeeb'
  : 'd6b309294d940aec716d61e4442dbddc92aea3f2ca4d1ca44bbdb345e250e5a0'
const examplePrefixedTemplateHash = blake2Support
  ? 'bc04504a69bdcd82540983d32efa4bf3f2454539e0e243854a680d03173545e7'
  : 'acb16f9d79a3961c1ee33dd308342a43cb169dd329b33ee87dd7d03a52887be4'
const examplePrefixedTemplateNestedHash = blake2Support
  ? 'bc09beb08c379217a922df992a0f209d6a0224d68d9377171e56511c90cb2da9'
  : '144fea9afe0c55305b58e22622a2fc634f361259d27f127a695e97358636a2ba'
const exampleEnvTemplateHash = blake2Support
  ? 'df27b01dbbeb108ef5f039d4eb6f245e5b57debc7bf5ad740188b3412abdb659'
  : '0a55bb450850a24c8050ace46871f63934fbde21ec6db9ee991298fbe83c440b'
const exampleEnvTemplateNestedHash = blake2Support
  ? 'f96b6db255682c9a733d317ac37d1667c55cde12f43bfd920fdf4b50e2794fda'
  : '5ade3f8969d093fd12fc47a16b8aafd7ce3c1064f15933dcb290a0217f1029a5'
const exampleSkippedTemplateHash = blake2Support
  ? '17aa37f315111fdea76f51933e37c12093e3f1cb9bed1b9fce78cdd56479960c'
  : 'd4ce4472a20370908b1307a4b640d8a0e6946ed4423b8b622d64229fda04c7bb'

const getTemplateObject = (prefix, bucketName = defaultBucketName, nestedTemplateHash) => {
  const bucketSub = new tagClasses.Sub('!Sub', bucketName)
  return {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: 'Test Stack Sets',
    Resources: {
      BasicExecRole: {
        Properties: {
          AssumeRolePolicyDocument: {
            Statement: [
              {
                Action: [
                  'sts:AssumeRole'
                ],
                Effect: 'Allow',
                Principal: {
                  Service: [
                    'lambda.amazonaws.com'
                  ]
                }
              }
            ],
            Version: '2012-10-17'
          },
          ManagedPolicyArns: [
            'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
            'arn:aws:iam::aws:policy/AWSXrayWriteOnlyAccess'
          ],
          RoleName: new tagClasses.Join(
            '!Sub',
            'test-stack-sets-lambda-role-${AWS::Region}' // eslint-disable-line no-template-curly-in-string
          )
        },
        Type: 'AWS::IAM::Role'
      },
      DummyAPIGAPI: {
        Properties: {
          Name: 'test-stack-sets-api',
          BodyS3Location: {
            Bucket: bucketSub,
            Key: `${prefix ? `${prefix}/` : ''}apigateway/restapi/dummyapigapi/dummy.json/${exampleAPIGHash}/dummy.json`
          }
        },
        Type: 'AWS::ApiGateway::RestApi'
      },
      DummyAppSyncGQLAPI: {
        Properties: {
          AuthenticationType: 'AWS_IAM',
          Name: 'test-stack-sets-gql-api'
        },
        Type: 'AWS::AppSync::GraphQLApi'
      },
      DummyAppSyncGQLDataSource: {
        Properties: {
          ApiId: new tagClasses.GetAtt('!GetAtt', 'DummyAppSyncGQLAPI.ApiId'),
          Name: 'dummyDataSource',
          Type: 'NONE'
        },
        Type: 'AWS::AppSync::DataSource'
      },
      DummyAppSyncGQLResolver: {
        Properties: {
          ApiId: new tagClasses.GetAtt('!GetAtt', 'DummyAppSyncGQLAPI.ApiId'),
          DataSourceName: new tagClasses.GetAtt('!GetAtt', 'DummyAppSyncGQLDataSource.Name'),
          FieldName: 'testStackSets',
          TypeName: 'Query',
          RequestMappingTemplateS3Location: new tagClasses.Sub('!Sub', `s3://${bucketName}/${prefix ? `${prefix}/` : ''}appsync/resolver/dummyappsyncgqlresolver/req.vtl/${exampleReqMapHash}/req.vtl`),
          ResponseMappingTemplateS3Location: new tagClasses.Sub('!Sub', `s3://${bucketName}/${prefix ? `${prefix}/` : ''}appsync/resolver/dummyappsyncgqlresolver/res.vtl/${exampleResMapHash}/res.vtl`)
        },
        Type: 'AWS::AppSync::Resolver'
      },
      DummyAppSyncGQLSchema: {
        Properties: {
          ApiId: new tagClasses.GetAtt('!GetAtt', 'DummyAppSyncGQLAPI.ApiId'),
          DefinitionS3Location: new tagClasses.Sub('!Sub', `s3://${bucketName}/${prefix ? `${prefix}/` : ''}appsync/graphqlschema/dummyappsyncgqlschema/schema.graphql/${exampleGQLSchemaHash}/schema.graphql`)
        },
        Type: 'AWS::AppSync::GraphQLSchema'
      },
      DummyEBSKApp: {
        Properties: {
          ApplicationName: 'test-stacks-ebsk'
        },
        Type: 'AWS::ElasticBeanstalk::Application'
      },
      DummyEBSKAppVersion: {
        Properties: {
          ApplicationName: new tagClasses.Ref('!Ref', 'DummyEBSKApp'),
          SourceBundle: {
            S3Bucket: bucketSub,
            S3Key: `${prefix ? `${prefix}/` : ''}elasticbeanstalk/applicationversion/dummyebskappversion/dummyFunction/${exampleEBSKVerHash}/dummyFunction.zip`
          }
        },
        Type: 'AWS::ElasticBeanstalk::ApplicationVersion'
      },
      DummyFunction: {
        Properties: {
          Code: {
            S3Bucket: bucketSub,
            S3Key: `${prefix ? `${prefix}/` : ''}lambda/function/dummyfunction/dummyFunction/${exampleLambdaHash}/dummyFunction.zip`
          },
          Description: 'Dummy function to test deployment',
          FunctionName: 'test-stack-sets-lambda',
          Handler: 'index.handler',
          MemorySize: 128,
          Role: new tagClasses.GetAtt('!GetAtt', 'BasicExecRole.Arn'),
          Runtime: 'nodejs10.x',
          Timeout: 10,
          TracingConfig: {
            Mode: 'Active'
          }
        },
        Type: 'AWS::Lambda::Function'
      },
      DummyGlueJob: {
        Properties: {
          Command: {
            Name: 'pythonshell',
            ScriptLocation: new tagClasses.Sub('!Sub', `s3://${bucketName}/${prefix ? `${prefix}/` : ''}glue/job/dummygluejob/dummy.py/${exampleGlueJobHash}/dummy.py`)
          },
          Role: new tagClasses.GetAtt('!GetAtt', 'GlueRole.Arn')
        },
        Type: 'AWS::Glue::Job'
      },
      DummyNestedStack: {
        Properties: {
          TemplateURL: new tagClasses.Sub('!Sub', `https://${bucketName}.s3.amazonaws.com/${prefix ? `${prefix}/` : ''}_dummynestedstack/template2.yml/${nestedTemplateHash}/template2.yml`)
        },
        Type: 'AWS::CloudFormation::Stack'
      },
      GlueRole: {
        Properties: {
          AssumeRolePolicyDocument: {
            Statement: [
              {
                Action: [
                  'sts:AssumeRole'
                ],
                Effect: 'Allow',
                Principal: {
                  Service: [
                    'glue.amazonaws.com'
                  ]
                }
              }
            ],
            Version: '2012-10-17'
          },
          RoleName: new tagClasses.Join(
            '!Join',
            [
              '-',
              [
                'test-stack-sets-glue-role',
                new tagClasses.Ref(
                  '!Ref',
                  'AWS::Region'
                )
              ]
            ]
          )
        },
        Type: 'AWS::IAM::Role'
      }
    }
  }
}
const getNestedTemplateObject = (prefix, bucketName = defaultBucketName) => {
  const bucketSub = new tagClasses.Sub('!Sub', bucketName)
  return {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: 'Test Stack Sets Nested',
    Resources: {
      BasicExecRole: {
        Properties: {
          AssumeRolePolicyDocument: {
            Statement: [
              {
                Action: [
                  'sts:AssumeRole'
                ],
                Effect: 'Allow',
                Principal: {
                  Service: [
                    'lambda.amazonaws.com'
                  ]
                }
              }
            ],
            Version: '2012-10-17'
          },
          ManagedPolicyArns: [
            'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
            'arn:aws:iam::aws:policy/AWSXrayWriteOnlyAccess'
          ],
          RoleName: new tagClasses.Join(
            '!Join',
            [
              '-',
              [
                'test-stack-sets-lambda-role2',
                new tagClasses.Ref(
                  '!Ref',
                  'AWS::Region'
                )
              ]
            ]
          )
        },
        Type: 'AWS::IAM::Role'
      },
      DummyFunction2: {
        Properties: {
          Code: {
            S3Bucket: bucketSub,
            S3Key: `${prefix ? `${prefix}/` : ''}_dummynestedstack/lambda/function/dummyfunction2/dummyFunction/${exampleLambdaHash2}/dummyFunction.zip`
          },
          Description: 'Dummy function to test deployment',
          FunctionName: 'test-stack-sets-lambda2',
          Handler: 'index.handler',
          MemorySize: 128,
          Role: new tagClasses.GetAtt('!GetAtt', 'BasicExecRole.Arn'),
          Runtime: 'nodejs10.x',
          Timeout: 10,
          TracingConfig: {
            Mode: 'Active'
          }
        },
        Type: 'AWS::Lambda::Function'
      }
    }
  }
}
const getSkippedTemplateObject = (prefix) => {
  return {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: 'Test Stack Sets',
    Resources: {
      BasicExecRole: {
        Properties: {
          AssumeRolePolicyDocument: {
            Statement: [
              {
                Action: [
                  'sts:AssumeRole'
                ],
                Effect: 'Allow',
                Principal: {
                  Service: [
                    'lambda.amazonaws.com'
                  ]
                }
              }
            ],
            Version: '2012-10-17'
          },
          ManagedPolicyArns: [
            'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
            'arn:aws:iam::aws:policy/AWSXrayWriteOnlyAccess'
          ],
          RoleName: new tagClasses.Join(
            '!Join',
            [
              '-',
              [
                'test-stack-sets-lambda-role',
                new tagClasses.Ref(
                  '!Ref',
                  'AWS::Region'
                )
              ]
            ]
          )
        },
        Type: 'AWS::IAM::Role'
      },
      DummyAPIGAPI: {
        Properties: {
          Name: 'test-stack-sets-api'
        },
        Type: 'AWS::ApiGateway::RestApi'
      },
      DummyAPIGAPI2: {
        Properties: {
          Name: 'test-stack-sets-api',
          BodyS3Location: {
            Bucket: 'dummybucket',
            Key: 'dummykey'
          }
        },
        Type: 'AWS::ApiGateway::RestApi'
      },
      DummyAppSyncGQLAPI: {
        Properties: {
          AuthenticationType: 'AWS_IAM',
          Name: 'test-stack-sets-gql-api'
        },
        Type: 'AWS::AppSync::GraphQLApi'
      },
      DummyAppSyncGQLResolver: {
        Properties: {
          ApiId: new tagClasses.GetAtt('!GetAtt', 'DummyAppSyncGQLAPI.ApiId'),
          FieldName: 'testStackSets',
          TypeName: 'Query',
          RequestMappingTemplateS3Location: 's3://dummybucket/gql/req.vtl'
        },
        Type: 'AWS::AppSync::Resolver'
      },
      DummyAppSyncGQLResolver2: {
        Properties: {
          ApiId: new tagClasses.GetAtt('!GetAtt', 'DummyAppSyncGQLAPI.ApiId'),
          FieldName: 'testStackSets',
          TypeName: 'Query',
          ResponseMappingTemplateS3Location: 's3://dummybucket/gql/res.vtl'
        },
        Type: 'AWS::AppSync::Resolver'
      },
      DummyAppSyncGQLSchema: {
        Properties: {
          ApiId: new tagClasses.GetAtt('!GetAtt', 'DummyAppSyncGQLAPI.ApiId')
        },
        Type: 'AWS::AppSync::GraphQLSchema'
      },
      DummyAppSyncGQLSchema2: {
        Properties: {
          ApiId: new tagClasses.GetAtt('!GetAtt', 'DummyAppSyncGQLAPI.ApiId'),
          DefinitionS3Location: 's3://dummybucket/gql/schema.graphql'
        },
        Type: 'AWS::AppSync::GraphQLSchema'
      },
      DummyEBSKApp: {
        Properties: {
          ApplicationName: 'test-stacks-ebsk'
        },
        Type: 'AWS::ElasticBeanstalk::Application'
      },
      DummyEBSKAppVersion: {
        Properties: {
          ApplicationName: new tagClasses.Ref('!Ref', 'DummyEBSKApp'),
          SourceBundle: {
            S3Bucket: 'dummybucket',
            S3Key: 'dummykey'
          }
        },
        Type: 'AWS::ElasticBeanstalk::ApplicationVersion'
      },
      DummyFunction: {
        Properties: {
          Code: {
            S3Bucket: 'dummybucket',
            S3Key: 'dummykey'
          },
          Description: 'Dummy function to test deployment',
          FunctionName: 'test-stack-sets-lambda',
          Handler: 'index.handler',
          MemorySize: 128,
          Role: new tagClasses.GetAtt('!GetAtt', 'BasicExecRole.Arn'),
          Runtime: 'nodejs10.x',
          Timeout: 10,
          TracingConfig: {
            Mode: 'Active'
          }
        },
        Type: 'AWS::Lambda::Function'
      },
      DummyGlueJob: {
        Properties: {
          Command: {
            NotScriptLocation: './packages/gluejob/dummy.py'
          },
          Role: new tagClasses.GetAtt('!GetAtt', 'GlueRole.Arn')
        },
        Type: 'AWS::Glue::Job'
      },
      DummyGlueJob2: {
        Properties: {
          Command: {
            ScriptLocation: 's3://dummybucket/dummykey/dummy.py'
          },
          Role: new tagClasses.GetAtt('!GetAtt', 'GlueRole.Arn')
        },
        Type: 'AWS::Glue::Job'
      },
      DummyNestedStack: {
        Properties: {
          TemplateURL: 'https://dummybucket.s3.amazonaws.com/dummykey/template.yml'
        },
        Type: 'AWS::CloudFormation::Stack'
      },
      GlueRole: {
        Properties: {
          AssumeRolePolicyDocument: {
            Statement: [
              {
                Action: [
                  'sts:AssumeRole'
                ],
                Effect: 'Allow',
                Principal: {
                  Service: [
                    'glue.amazonaws.com'
                  ]
                }
              }
            ],
            Version: '2012-10-17'
          },
          RoleName: new tagClasses.Join(
            '!Join',
            [
              '-',
              [
                'test-stack-sets-glue-role',
                new tagClasses.Ref(
                  '!Ref',
                  'AWS::Region'
                )
              ]
            ]
          )
        },
        Type: 'AWS::IAM::Role'
      }
    }
  }
}

const getPsuedoRandBetween = (minNum, maxNum) => {
  return Math.floor(Math.random() * (maxNum - minNum + 1) + minNum)
}

/* AWS Account numbers are 12 digits so set a corresponding max and min */
const AWS_ACCT_NUM_MAX = 999999999999
const AWS_ACCT_NUM_MIN = /* 00000000000 */1
const mockAWSAcctNum = getPsuedoRandBetween(AWS_ACCT_NUM_MIN, AWS_ACCT_NUM_MAX)

const targets = {
  [mockAWSAcctNum]: {
    'us-east-1': true,
    'us-west-2': true
  }
}

AWS.mock('S3', 'upload', jest.fn((params, callback) => {
  const {
    Bucket,
    Key
  } = params
  return callback(null, { Location: `https://${Bucket}.s3.amazonaws.com/${Key}`, Bucket, Key })
}))

describe('Artifact Upload', () => {
  beforeEach(() => {
    jest.doMock('../utilities/archiveFilePath.js', () => {
      return {
        archiveFilePath: async (filePath) => {
          const archiveFilePath = path.join(filePath, `${path.basename(filePath)}.zip`).replace(`packages${path.sep}`, `packagesArchived${path.sep}`)
          return archiveFilePath
        },
        archiveFormats: { zip: 'zip' }
      }
    })
  })
  test('Complete artifact upload', async () => {
    const { artifactUpload } = require('./artifactUpload.js')
    expect.assertions(1)
    const templateName = 'template.yml'
    const templateS3Path = `${templateName}/${exampleTemplateHash}/${templateName}`
    const result = await expect(artifactUpload(templateName, stackSetBucket, '', stackSetName, '', targets)).resolves.toEqual({
      url: `https://${stackSetBucket}.s3.amazonaws.com/${templateS3Path}`,
      s3URL: `s3://${stackSetBucket}/${templateS3Path}`,
      yamlDocMap: {
        _dummynestedstack: {
          doc: getNestedTemplateObject()
        },
        doc: getTemplateObject('', defaultBucketName, exampleTemplateNestedHash)
      }
    })
    return result
  })
  test('Complete artifact upload with abs pathed template', async () => {
    const { artifactUpload } = require('./artifactUpload.js')
    expect.assertions(1)
    const templateName = 'template.yml'
    const templateS3Path = `${templateName}/${exampleTemplateHash}/${templateName}`
    const templatePath = path.join(process.cwd(), templateName)
    const result = await expect(artifactUpload(templatePath, stackSetBucket, '', stackSetName, '', targets)).resolves.toEqual({
      url: `https://${stackSetBucket}.s3.amazonaws.com/${templateS3Path}`,
      s3URL: `s3://${stackSetBucket}/${templateS3Path}`,
      yamlDocMap: {
        _dummynestedstack: {
          doc: getNestedTemplateObject()
        },
        doc: getTemplateObject('', defaultBucketName, exampleTemplateNestedHash)
      }
    })
    return result
  })
  test('Complete artifact upload with prefix', async () => {
    const { artifactUpload } = require('./artifactUpload.js')
    expect.assertions(1)
    const templateName = 'template.yml'
    const prefix = 'prefixed'
    const templateS3Path = `${prefix}/${templateName}/${examplePrefixedTemplateHash}/${templateName}`
    const result = await expect(artifactUpload(templateName, stackSetBucket, prefix, stackSetName, prefix, targets)).resolves.toEqual({
      url: `https://${stackSetBucket}.s3.amazonaws.com/${templateS3Path}`,
      s3URL: `s3://${stackSetBucket}/${templateS3Path}`,
      yamlDocMap: {
        _dummynestedstack: {
          doc: getNestedTemplateObject(prefix)
        },
        doc: getTemplateObject(prefix, defaultBucketName, examplePrefixedTemplateNestedHash)
      }
    })
    return result
  })
  test('Complete artifact upload with environment', async () => {
    const { artifactUpload } = require('./artifactUpload.js')
    expect.assertions(1)
    const templateName = 'template.yml'
    const templateS3Path = `${templateName}/${exampleEnvTemplateHash}/${templateName}`
    const environment = 'prod'
    const stackSetBucketEnv = `${stackSetBucket}-${environment}`
    const bucketName = `${defaultBucketName}-\${Environment}`
    const result = await expect(artifactUpload(templateName, stackSetBucket, '', stackSetName, '', targets, environment)).resolves.toEqual({
      url: `https://${stackSetBucketEnv}.s3.amazonaws.com/${templateS3Path}`,
      s3URL: `s3://${stackSetBucketEnv}/${templateS3Path}`,
      yamlDocMap: {
        _dummynestedstack: {
          doc: getNestedTemplateObject('', bucketName)
        },
        doc: getTemplateObject('', bucketName, exampleEnvTemplateNestedHash)
      }
    })
    return result
  })
  test('Skip all with an already processed or S3 referencing template', async () => {
    const { artifactUpload } = require('./artifactUpload.js')
    expect.assertions(1)
    const templateName = 'templateSkipAll.yml'
    const templateS3Path = `${templateName}/${exampleSkippedTemplateHash}/${templateName}`
    const result = await expect(artifactUpload(templateName, stackSetBucket, '', stackSetName, '', targets)).resolves.toEqual({
      url: `https://${stackSetBucket}.s3.amazonaws.com/${templateS3Path}`,
      s3URL: `s3://${stackSetBucket}/${templateS3Path}`,
      yamlDocMap: {
        doc: getSkippedTemplateObject()
      }
    })
    return result
  })
  test('Gets an error when deploying a template without Type for a resource', async () => {
    const { artifactUpload } = require('./artifactUpload.js')
    expect.assertions(1)
    const templatePath = 'templateNoType.yml'
    const result = await expect(artifactUpload(templatePath, stackSetBucket, '', stackSetName, '', targets)).rejects.toThrow()
    return result
  })
  test('Gets an error when deploying a template without Properties for a resource', async () => {
    const { artifactUpload } = require('./artifactUpload.js')
    expect.assertions(1)
    const templatePath = 'templateNoProperties.yml'
    const result = await expect(artifactUpload(templatePath, stackSetBucket, '', stackSetName, '', targets)).rejects.toThrow()
    return result
  })
  test('Gets an error when deploying a template without Code property for Lambda', async () => {
    const { artifactUpload } = require('./artifactUpload.js')
    expect.assertions(1)
    const templatePath = 'templateNoLambdaCode.yml'
    const result = await expect(artifactUpload(templatePath, stackSetBucket, '', stackSetName, '', targets)).rejects.toThrow()
    return result
  })
  test('Gets an error when deploying a template without SourceBundle property for Elastic Beanstalk', async () => {
    const { artifactUpload } = require('./artifactUpload.js')
    expect.assertions(1)
    const templatePath = 'templateNoEBSKBundle.yml'
    const result = await expect(artifactUpload(templatePath, stackSetBucket, '', stackSetName, '', targets)).rejects.toThrow()
    return result
  })
  test('Gets an error when deploying a template without TemplateURL property for Lambda', async () => {
    const { artifactUpload } = require('./artifactUpload.js')
    expect.assertions(1)
    const templatePath = 'templateNoStackTemplate.yml'
    const result = await expect(artifactUpload(templatePath, stackSetBucket, '', stackSetName, '', targets)).rejects.toThrow()
    return result
  })
  test('Gets an error when deploying a malformed template', async () => {
    const { artifactUpload } = require('./artifactUpload.js')
    expect.assertions(1)
    const templatePath = 'template-malformed.yml'
    const result = await expect(artifactUpload(templatePath, stackSetBucket, '', stackSetName, '', targets)).rejects.toThrow()
    return result
  })
})
