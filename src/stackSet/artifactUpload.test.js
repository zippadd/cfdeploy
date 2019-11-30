/* eslint-env jest */
const path = require('path')
const AWS = require('aws-sdk-mock')
const AWS_SDK = require('aws-sdk')
AWS.setSDKInstance(AWS_SDK)
const { getCloudformationYAMLSchema } = require('../utilities/getCloudformationYAMLSchema.js')
const stackSetName = 'test-stacksets-us-east-1'
const exampleAPIGHash = '58a4d68a85b629f9c6998235b712bfc92e5c263ad55ad85cd78bbd50b230c734'
const exampleReqMapHash = '5102f6c4ea402366aa8ce156a50ab5af28b4c452a80b423442b18b312e7bacb1'
const exampleResMapHash = 'a0e14b00adaee553932d81d51006af614e2cc3673d190c17c1c7776ae2046a16'
const exampleGQLSchemaHash = 'e79ff19122806abb64cbabdc4a1c22218081d4985436555c325fbf41577ba55e'
const exampleEBSKVerHash = '45aefb65689642d2cb7f4bfcbc78f188e9a4caff20514fd0b3137cbc12ef7237'
const exampleLambdaHash = '45aefb65689642d2cb7f4bfcbc78f188e9a4caff20514fd0b3137cbc12ef7237'
const exampleGlueJobHash = '69217a3079908094e11121d042354a7c1f55b6482ca1a51e1b250dfd1ed0eef9'
const exampleLambdaHash2 = '45aefb65689642d2cb7f4bfcbc78f188e9a4caff20514fd0b3137cbc12ef7237'

const tagClasses = {}
for (const explicitType of getCloudformationYAMLSchema().explicit) {
  const name = explicitType.tag.replace('!', '')
  tagClasses[name] = explicitType.instanceOf
}

const getTemplateObject = (prefix) => {
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
          Name: 'test-stack-sets-api',
          BodyS3Location: `s3://${stackSetName}/${prefix ? `${prefix}/` : ''}apigateway/restapi/dummyapigapi/dummy.json/${exampleAPIGHash}/dummy.json`
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
          RequestMappingTemplateS3Location: `s3://${stackSetName}/${prefix ? `${prefix}/` : ''}appsync/resolver/dummyappsyncgqlresolver/req.vtl/${exampleReqMapHash}/req.vtl`,
          ResponseMappingTemplateS3Location: `s3://${stackSetName}/${prefix ? `${prefix}/` : ''}appsync/resolver/dummyappsyncgqlresolver/res.vtl/${exampleResMapHash}/res.vtl`
        },
        Type: 'AWS::AppSync::Resolver'
      },
      DummyAppSyncGQLSchema: {
        Properties: {
          ApiId: new tagClasses.GetAtt('!GetAtt', 'DummyAppSyncGQLAPI.ApiId'),
          DefinitionS3Location: `s3://${stackSetName}/${prefix ? `${prefix}/` : ''}appsync/graphqlschema/dummyappsyncgqlschema/schema.graphql/${exampleGQLSchemaHash}/schema.graphql`
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
            S3Bucket: stackSetName,
            S3Key: `${prefix ? `${prefix}/` : ''}elasticbeanstalk/applicationversion/dummyebskappversion/dummyFunction/${exampleEBSKVerHash}/dummyFunction.zip`
          }
        },
        Type: 'AWS::ElasticBeanstalk::ApplicationVersion'
      },
      DummyFunction: {
        Properties: {
          Code: {
            S3Bucket: stackSetName,
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
            ScriptLocation: `s3://${stackSetName}/${prefix ? `${prefix}/` : ''}glue/job/dummygluejob/dummy.py/${exampleGlueJobHash}/dummy.py`
          },
          Role: new tagClasses.GetAtt('!GetAtt', 'GlueRole.Arn')
        },
        Type: 'AWS::Glue::Job'
      },
      DummyNestedStack: {
        Properties: {
          TemplateURL: `https://${stackSetName}.s3.amazonaws.com/${prefix ? `${prefix}/` : ''}_dummynestedstack/template2.yml`
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
const getNestedTemplateObject = (prefix) => {
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
            S3Bucket: 'test-stacksets-us-east-1',
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
          BodyS3Location: 's3://dummybucket/key/api.json'
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
    const templatePath = 'template.yml'
    const result = await expect(artifactUpload(templatePath, stackSetName, '')).resolves.toEqual({
      url: `https://${stackSetName}.s3.amazonaws.com/${templatePath}`,
      s3URL: `s3://${stackSetName}/${templatePath}`,
      yamlDocMap: {
        _dummynestedstack: {
          doc: getNestedTemplateObject()
        },
        doc: getTemplateObject()
      }
    })
    return result
  })
  test('Complete artifact upload with abs pathed template', async () => {
    const { artifactUpload } = require('./artifactUpload.js')
    expect.assertions(1)
    const templateName = 'template.yml'
    const templatePath = path.join(process.cwd(), templateName)
    const result = await expect(artifactUpload(templatePath, stackSetName, '')).resolves.toEqual({
      url: `https://${stackSetName}.s3.amazonaws.com/${templateName}`,
      s3URL: `s3://${stackSetName}/${templateName}`,
      yamlDocMap: {
        _dummynestedstack: {
          doc: getNestedTemplateObject()
        },
        doc: getTemplateObject()
      }
    })
    return result
  })
  test('Complete artifact upload with prefix', async () => {
    const { artifactUpload } = require('./artifactUpload.js')
    expect.assertions(1)
    const templatePath = 'template.yml'
    const prefix = 'prefixed'
    const result = await expect(artifactUpload(templatePath, stackSetName, prefix)).resolves.toEqual({
      url: `https://${stackSetName}.s3.amazonaws.com/${prefix ? `${prefix}/` : ''}${templatePath}`,
      s3URL: `s3://${stackSetName}/${prefix ? `${prefix}/` : ''}${templatePath}`,
      yamlDocMap: {
        _dummynestedstack: {
          doc: getNestedTemplateObject(prefix)
        },
        doc: getTemplateObject(prefix)
      }
    })
    return result
  })
  test('Skip all with an already processed or S3 referencing template', async () => {
    const { artifactUpload } = require('./artifactUpload.js')
    expect.assertions(1)
    const templatePath = 'templateSkipAll.yml'
    const result = await expect(artifactUpload(templatePath, stackSetName, '')).resolves.toEqual({
      url: `https://${stackSetName}.s3.amazonaws.com/${templatePath}`,
      s3URL: `s3://${stackSetName}/${templatePath}`,
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
    const result = await expect(artifactUpload(templatePath, stackSetName, '')).rejects.toThrow()
    return result
  })
  test('Gets an error when deploying a template without Properties for a resource', async () => {
    const { artifactUpload } = require('./artifactUpload.js')
    expect.assertions(1)
    const templatePath = 'templateNoProperties.yml'
    const result = await expect(artifactUpload(templatePath, stackSetName, '')).rejects.toThrow()
    return result
  })
  test('Gets an error when deploying a template without Code property for Lambda', async () => {
    const { artifactUpload } = require('./artifactUpload.js')
    expect.assertions(1)
    const templatePath = 'templateNoLambdaCode.yml'
    const result = await expect(artifactUpload(templatePath, stackSetName, '')).rejects.toThrow()
    return result
  })
  test('Gets an error when deploying a template without SourceBundle property for Elastic Beanstalk', async () => {
    const { artifactUpload } = require('./artifactUpload.js')
    expect.assertions(1)
    const templatePath = 'templateNoEBSKBundle.yml'
    const result = await expect(artifactUpload(templatePath, stackSetName, '')).rejects.toThrow()
    return result
  })
  test('Gets an error when deploying a template without TemplateURL property for Lambda', async () => {
    const { artifactUpload } = require('./artifactUpload.js')
    expect.assertions(1)
    const templatePath = 'templateNoStackTemplate.yml'
    const result = await expect(artifactUpload(templatePath, stackSetName, '')).rejects.toThrow()
    return result
  })
  test('Gets an error when deploying a malformed template', async () => {
    const { artifactUpload } = require('./artifactUpload.js')
    expect.assertions(1)
    const templatePath = 'template-malformed.yml'
    const result = await expect(artifactUpload(templatePath, stackSetName, '')).rejects.toThrow()
    return result
  })
})
