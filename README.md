# CFDeploy
[![Build Status](https://travis-ci.com/zippadd/cfdeploy.svg?branch=master)](https://travis-ci.com/zippadd/cfdeploy)
Node.js module for deploying Cloudformation templates.

Currently only supports stacksets as this seemed to be a general gap in the community, but may be extended in the future.

## Stacksets
Uploads the referenced Cloudformation in the cfdeploy file to the given bucket and creates/updates the stack set per the given name.
* For creations, it will create stackset instances per specified targets (AWS account/region)
* For updates, it will update existing stackset instances first and then remove/create stackset instances per specified targets (AWS account/region)

# Installation
```bash
npm install -g cfdeploy
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
* File naming / location
  * cfdeploy.yml, placed in the root (like e.g. .travis.yml) for easiest use and recognition
  * Can be named anything and placed wherever, but must specify file option (see above)

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

# Contributing
I welcome pull requests, especially for bugfixes, and issue submissions.
Please reach out if a larger feature is being considered so we can discuss prior to a PR.

# License
MIT