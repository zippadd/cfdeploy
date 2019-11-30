const yaml = require('js-yaml')

class CFFunction {
  constructor (functionTag, functionData) {
    this.tag = functionTag
    this.data = functionData
  }
}

const getCloudformationYAMLSchema = () => {
  /* Cloudformation Intrinsic Functions
     https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference.html
  */
  const yamlTypeDefs = [
    { tag: '!Base64', kind: 'scalar' },
    { tag: '!Cidr', kind: 'sequence' },
    { tag: '!And', kind: 'sequence' },
    { tag: '!Equals', kind: 'sequence' },
    { tag: '!If', kind: 'sequence' },
    { tag: '!Not', kind: 'sequence' },
    { tag: '!Or', kind: 'sequence' },
    { tag: '!FindInMap', kind: 'sequence' },
    { tag: '!GetAtt', kind: 'scalar' },
    { tag: '!GetAZs', kind: 'scalar' },
    { tag: '!ImportValue', kind: 'scalar' },
    { tag: '!Join', kind: 'sequence' },
    { tag: '!Select', kind: 'sequence' },
    { tag: '!Split', kind: 'sequence' },
    { tag: '!Sub', kind: 'scalar' },
    { tag: '!Transform', kind: 'mapping' },
    { tag: '!Ref', kind: 'scalar' }
  ]
  const yamlTypes = []
  for (const yamlTypeDef of yamlTypeDefs) {
    const { tag, kind } = yamlTypeDef
    const TagClass = class extends CFFunction {}
    const yamlType = new yaml.Type(
      tag,
      {
        kind,
        construct: (data) => {
          return new TagClass(tag, data)
        },
        instanceOf: TagClass,
        represent: (cfFunction) => {
          return cfFunction.data
        }
      }
    )
    yamlTypes.push(yamlType)
  }
  return yaml.Schema.create(yamlTypes)
}

module.exports = {
  getCloudformationYAMLSchema
}
