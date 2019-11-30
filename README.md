# CFDeployer
[![Build Status](https://travis-ci.com/zippadd/cfdeploy.svg?branch=master)](https://travis-ci.com/zippadd/cfdeploy)
[![codecov](https://codecov.io/gh/zippadd/cfdeploy/branch/master/graph/badge.svg)](https://codecov.io/gh/zippadd/cfdeploy)
[![dependencies Status](https://david-dm.org/zippadd/cfdeploy/status.svg)](https://david-dm.org/zippadd/cfdeploy)
[![devDependencies Status](https://david-dm.org/zippadd/cfdeploy/dev-status.svg)](https://david-dm.org/zippadd/cfdeploy?type=dev)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

Node.js module for deploying Cloudformation templates.

Currently only supports stacksets as this seemed to be a general gap in the community, but may be extended in the future.

## Stacksets
Uploads the referenced Cloudformation in the cfdeploy file to the given bucket and creates/updates the stack set per the given name.
* For creations, it will create stackset instances per specified targets (AWS account/region)
* For updates, it will update existing stackset instances first and then remove/create stackset instances per specified targets (AWS account/region)

# Installation
```bash
npm install -g cfdeployer
```

# Usage
```bash
cfdeploy <options>
```

| Option                | Description               | Default (if omitted) |
|-----------------------|---------------------------|----------------------|
| -f, --file <filePath> | Path to the cfdeploy file | cfdeploy.yml         |

# CFDeploy File Structure
* Languages
  * Only YAML is supported. 
* File Naming / Location
  * cfdeploy.yml, placed in the root (like e.g. .travis.yml) for easiest use and recognition
  * Can be named anything and placed wherever, but must specify file option (see above)
* Cloudformation Template Restrictions
  * Template must be YAML

```yaml
deployments:
  - 
    type: stackSet
    name: <name of stackset/deployment>
    templatePath: <path to Cloudformation template>
    s3Bucket: <S3 bucket to upload Cloudformation template to>
    s3Prefix: <Prefix for the uploaded template (with or without trailing slash) e.g. thisIs/aPrefix/ >
    targets:
      <AWS account number or "default" for current user's AWS account number>:
        <region 1>: true
        <region 2>: true
        ...Additional regions as needed
      ...Additional AWS account numbers with regions as needed
  -
    ...Additional deployments as needed
```

# Automatic Artifact Upload
Similar to the Cloudformation CI [package command](https://docs.aws.amazon.com/cli/latest/reference/cloudformation/package.html),
CFDeployer automatically uploads locally referenced artifacts to the S3 bucket and prefix specified in the CFDeploy file. It supports
all of the resource types that the package command supports, except types that are not supported in stack sets. It packages the
artifact as appropriate to the resource type (e.g. if zipping is required as for Lambda Function resources). Folders will be
automatically zipped.

Nested stacks are supported. The resource name name of the nested stack is used to construct the path.

S3 key limitations of 1024 bytes apply, so be sure to avoid excessively long resource and/or file names.

## Uploaded Artifact S3 Key Structure
### Template Files
```
<prefix>/<nested paths (if any)>/<template file name>/<256 bit file hash>/<template file name>
s3Prefix/template.yml/0ff5ef46180f4430eaa816fb239b4f3fc4c06db8f246e90a7c444ee25016e29d/template.yml - base or non-nested template
s3Prefix/_nestedStack1/_nestedNestedStack1/template.yml/0ff5ef46180f4430eaa816fb239b4f3fc4c06db8f246e90a7c444ee25016e29d/template.yml - nested template
```

### Non-Template Files
```
<prefix>/<nested paths (if any)>/<resource service>/<resource service type>/<file or directory name>/<256 bit file hash>/<file or zipped directory name>
s3Prefix/lambda/function/index.js/0ff5ef46180f4430eaa816fb239b4f3fc4c06db8f246e90a7c444ee25016e29d/index.js.zip - file in non-nested template
s3Prefix/lambda/function/codeDirectory/0ff5ef46180f4430eaa816fb239b4f3fc4c06db8f246e90a7c444ee25016e29d/codeDirectory.zip - directory in non-nested template
s3Prefix/_nestedStack1/_nestedNestedStack1/lambda/function/codeDirectory/0ff5ef46180f4430eaa816fb239b4f3fc4c06db8f246e90a7c444ee25016e29d/codeDirectory.zip - file in nested template
```

# 

# Contributing
I welcome pull requests, especially for bugfixes, and issue submissions.
Please reach out if a larger feature is being considered so we can discuss prior to a PR.

# License
MIT