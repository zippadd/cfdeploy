# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.2.2] - 2020-01-04
### Changed
- Fixed template upload logic to use hash versioning per the documentation

## [2.2.1] - 2020-01-04
### Changed
- Minor documentation update clarifying requirements and purpose
- Dependency update

## [2.2.0] - 2020-01-04
### Added
- Support for alternate Sub format in Cloudformation templates
### Changed
- Environment support now applies to artifact uploads as well
- Updated documentation

## [2.1.0] - 2019-12-24
### Added
- Added environment support
- More verbose logging
### Changed
- Update aws-sdk-mock to 5.0.0
- Failures no longer cause an immediate exit, but wait for all statuses to be reported

## [2.0.1] - 2019-12-21
### Added
- Added direct option

## [2.0.0] - 2019-11-29
### Added
- Automatic artifact upload capability
### Changed
- Refactorization of common functions
- Refactorization of existing functions to work with artifact upload capability
- CFDeploy YAML format
- Clarify Node Js requirements
- Update README and CHANGELOG

## [1.0.2] - 2019-10-12
### Changed
- Update README to reflect name change

## [1.0.1] - 2019-10-12
### Changed
- Fix bin path

## [1.0.0] - 2019-10-10
### Added
- Initial implementation / release
