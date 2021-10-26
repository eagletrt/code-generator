![Lint](https://github.com/eagletrt/code-generator/workflows/Lint/badge.svg)
![Build](https://github.com/eagletrt/code-generator/workflows/Build/badge.svg)
![Test](https://github.com/eagletrt/code-generator/workflows/Test/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/eagletrt/code-generator/badge.svg?branch=master)](https://coveralls.io/github/eagletrt/code-generator?branch=master)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![dependencies Status](https://david-dm.org/eagletrt/code-generator/status.svg)](https://david-dm.org/eagletrt/code-generator)
[![License](https://img.shields.io/npm/l/code-generator.svg)](https://github.com/eagletrt/code-generator/blob/master/LICENSE)
[![Types](https://img.shields.io/npm/types/@eagletrt/code-generator.svg)](https://www.npmjs.com/package/@eagletrt/code-generator)

# code-generator
Generate dinamically code for the [@eagletrt](https://www.github.com/eagletrt) telemetry

## Project purpose

This project is an **npm** package made for the **telemetry** of eagletrt. The telemetry consists in a **c program** located in a **Raspberry Pi** and attached to the canbus of the car and to a rover-gps. Its job is reading all the sensors **messages**, forwarding them via mqtt and saving them in a local mongodb database. In particular, all messages are **accumulated** in a **structure** for some hundreds of milliseconds, the structure is parsed to **bson** and then it is sent via mqtt and saved in the database. After that the process starts again. The problem is that c is a **statically typed** programming language while the structure of the saved data **changes very frequently** and is quite **articulated**. Changing the c struct and the bson parser every time that the structure was modified was a **hell**. Hence this project was made. I started thinking that there exist some **dynamically typed** languages, such as **typescript**. The structure of the saved data is now represented in a **json** file and there is this **nodejs** module that reads that json file and **generates the c code that depends on it**. So now **we just need to change that json file and execute this module, saving hours of time**. In the second version, this method has been applied to the **config parser** as well, while in the third version, even the **can messages parsers** are generated by this project.

## How it was made

This project was made with **typescript** and consists in an npm module that can be used also **globally**, as a terminal command. It is linted with **eslint**, tested with **mocha**, bundled with **webpack**, documented with **typedoc** and checked by some **github actions**.

## How does it work

The library gets as inputs a **src** folder, a **structure.model.json** file and a **config.model.json** file. Then it reads the json files, whose content will **determine the generated code**, fetch all the files in the src folder whose extension is preceded by **.template** (example: `main.template.c`), search for some **special comments** in the code (such as `// {{GENERATE_BSON}}`) and **create** a file without the .template extension with the right **generated code instead of the comment**.

The part of the code that will be probably changed more frequently is the part where the **code is generated**. It resides in the `source/lib/generators` folder. All files with extension **.generator.ts** contain a class that extends the **Generator class**: they have a **generate** method that generates the code in base of the structure.json and a **comment field**, which is the comment string where the generated code will be put. To **add a new generator**, it is only needed to add a new file ending with **.generator.ts** containing a class extending **Generator** and properly implemented. All the rest of the code will remain unchanged.

## How to use it

This module can be actually used both as a **local** and as a **global** npm module.

### As a local module

Install the module executing:

```bash
$ npm install --save @eagletrt/code-generator
```

Running this script:

```javascript
const generator = require('@eagletrt/code-generator');

const src = './code';
const structureModel = './code/structure.model.json';
const configModel = './code/config.model.json';
const options = {
    extensions: ['c', 'h', 'cpp', 'hpp'],
    log: true
};

generator.generate(src, structureModel, configModel, options);
```

Given a directory tree such as:

```
code/
    structure/
        structure.template.h
        structure.c
    utils/
        utils.h
        utils.template.c
    main.template.c
```

The result will be:

```
code/
    structure/
        structure.template.h
        structure.h
        structure.c
    utils/
        utils.h
        utils.template.c
        utils.c
    main.template.c
    main.c
```

To see all the options, refer to the **api**.

### As a global module

Install the module with:

```bash
$ npm install -g @eagletrt/code-generator
```

Executing:

```bash
$ eagle-cg generate --src code --structure-model ./code/structure.model.json --config-model ./code/config.model.json --extensions c h
```

Will have the same result as the example with the local module.

The options are almost the same as in the **api** of the local module. To see all the cli options, run:

```bash
$ eagle-cg generate --help
```

## The structure model file

The structure model file is a **json** file that **represents how will be saved the data** in mongodb.

Every message is an object containing the **timestamp** of the message and its **value**. If a message contains more than a value, the value property will be **a nested object**.

The structure consists in **a few primitive properties** and all the **message details objects**, that can be **nested and grouped in other objects** and are always **inside an array**.

The arrays contain only one element, that is the **message details object**. 

The **message details objects** have these properties:
- __timestamp__: It is required and is the type of the timestamp of the message (e.g. `long`)
- __value__: It is required and describes the value of the message. The value can be **composite** or **simple**. A composite value is just an object whose keys are valued with simple values. A simple values could be a **value primitive**, which is a string representing the type of the value (e.g. `int`), or a **value definition**, which is an object having a **type** property (a value primitive) and the **value** property, which is a string used by the **can gatherer generator** and that describes how to get the message value.
- __maxLength__: It is required and **maximum number of messages** that can be saved in a single document.
- __name__: It is the message **name**, used by the can gatherer parser to call the right function to **parse** the message.
- __network__: It says to which **can network** does the message belong to. It is used by the can gatherer parser to understand to which canbus gatherer the message should be placed into.
- __defines__: An object of **value definitions**, that defines **temp variables** that can be used by the **value** property of another **value definitions**.

### Simple example

An example of structure could be this:

```json
{
    "id": "int",
    "timestamp": "long",
    "sessionName": "char*",
    "throttle": [
        {
            "timestamp": "long",
            "value": "double",
            "maxLength": 200
        }
    ],
    "brake": [
        {
            "timestamp": "long",
            "value": "double",
            "maxLength": 200
        }
    ],
    "bms_hv": {
        "temperature": [
            {
                "timestamp": "long",
                "value": {
                    "max": "double",
                    "min": "double",
                    "average": "double"
                },
                "maxLength": 500
            }
        ],
        "voltage": [
            {
                "timestamp": "long",
                "value": {
                    "max": "double",
                    "min": "double",
                    "total": "double"
                },
                "maxLength": 500
            }
        ]
    }
}
```
A javascript instance of that structure could be:

```json
{
    "id": 23,
    "timestamp": 10483862400000,
    "sessionName": "2020_04_23__12_00_00__pilot_race",
    "throttle": [
        {
            "timestamp": 10483862400001,
            "value": 0
        },
        {
            "timestamp": 10483862400002,
            "value": 5
        },
        {
            "timestamp": 10483862400003,
            "value": 6
        }
    ],
    "brake": [
         {
            "timestamp": 10483862400001,
            "value": 0
        },
        {
            "timestamp": 10483862400004,
            "value": 100
        }
    ],
    "bms_hv": {
        "temperature": [
            {
                "timestamp": 10483862400000,
                "value": {
                    "max": 28,
                    "min": 22,
                    "average": 25
                }
            }
        ],
        "voltage": [
            {
                "timestamp": 10483862400000,
                "value": {
                    "max": 312,
                    "min": 200,
                    "total": 250
                }
            },
            {
                "timestamp": 10483862400007,
                "value": {
                    "max": 312,
                    "min": 200,
                    "total": 250
                }
            }
        ]
    }
}
```

Where every array contains all the messages of a certain type, arrived in x milliseconds.

### Complex example

An example with properties regarding the can gatherer parser:

```json
{
    "id": "int",
    "timestamp": "long",
    "sessionName": "char*",
    "throttle": [
        {
            "timestamp": "long",
            "value": "double",
            "maxLength": 200
        }
    ],
    "brake": [
        {
            "timestamp": "long",
            "value": {
                "type": "double",
                "value": "#value"
            },
            "maxLength": 200,
            "name": "BRAKE",
            "network": "Primary"
        }
    ],
    "bms_hv": {
        "temperature": [
            {
                "timestamp": "long",
                "value": {
                    "max": {
                        "type": "double",
                        "value": "$value * $scale"
                    },
                    "min": {
                        "type": "double",
                        "value": "$value * $scale"
                    },
                    "average": "((#max + #min) / 2) * $scale"
                },
                "maxLength": 500,
                "name": "HV_TEMP",
                "network": "Secondary",
                "definitions": {
                    "scale": { 
                        "type": "double",
                        "value": "#scale + 1.5"
                    }
                }
            }
        ],
        "voltage": [
            {
                "timestamp": "long",
                "value": {
                    "max": "double",
                    "min": "double",
                    "total": "#max + #min",
                    "maxLength": 500,
                    "name": "HV_VOLT",
                    "network": "Primary"
                }
            }
        ]
    }
}
```

In this example:
* The `throttle` message is not parsed by the can gatherer. This is because the `name` and `network` properties are not set.
* The `brake` message is parsed by the `Primary` can gatherer. Each time from the `Primary` can bus, a message with id `ID_BRAKE` (here is why the `name` prop is important) is received, its message is parsed (always with a function that uses the message `name`) and its `brake` property will be returned as value (`#brake` means: "get the brake property of the parsed can message).
* The `bms_hv_temperature` message is parsed by the `Secondary` can gatherer. Each time it receives a message with id `ID_HV_TEMP`, it parses the can message. After that it will define the temp var `scale`, whose value will be the `scale` property of the can message plus `1.5`. Then the `max` message value will be the `max` property of the can message (`$value` is an alias for `#current_composite_value_key`) multiplied for the `scale` var. `min` will have as value the `min` property of the can message multiplied for the `scale` temp var. `average` will be the sum of the `max` and `min` can message values divided by `2` and multiplied for the `scale` temp var.
* The `bms_hv_voltage` message s parsed by the `Primary` can gatherer. Each time it receives a message with id `ID_HV_VOLT`, The `max` returned value will be the `max` property of the can message value (if only the type is specified, the value is inferred to be `$value`), the `min` returned value will be the `min` property of the can message value and the `total` property will be the sum of the `max` and `min` can message values.

In general:
1. The **can message is parsed** and the can message value is obtained
2. Each **define** is stored in a **temp var** called as the **key** of the define. Its **value** will be the **expression** passed to that key, that can refer to **can message value's properties** that begins with `#` or other **already-defined** temp vars that begin with `$`.
3. Each message value is gotten. If only the **type** is provided, the **value** is inferred to be `$value`. The `$value` is an alias for `#current_composite_value_key`. Each `#prop` var is substituted by the `prop` of the can message value and each `$temp` is substituted by the `temp` temp variable.

### Json schema check

The passed structure.model.json is checked with **[this json schema](https://github.com/eagletrt/code-generator/blob/master/source/lib/schemas/structure.schema.json)**.

## The config model file

The config model file is a **json** file that **represents how will be the json config** of the telemetry.

This model has the purpose of declaring the possible options, that can be nested objects, arrays or primitive values. It declares also the **default** value if that option will not be specified by the configuration file.

It is an object that can contain:
* `string` or `number` as primitive default values.
* Arrays of `string` or `number` as default array values. These arrays __have to be homogeneus__ and there can be arrays of strings, integers (no decimal part) or floating point (no integer accepted). Thet have to have at least one default value so that the generator can understand its C type.
* Nested objects satisfying the two previous constraints in order to group related options together.

An example of config could be this:

```json
{
    "can_interface": "can0",
    "rate": 500,
    "inc": 1.5,
    "pilots": [ "default", "Ivan", "Davide" ],
    "mqtt": {
        "hostname": "localhost",
        "port": 1883,
        "topic": "telemetria"
    }
}
```
A config.json satisfying that model could be:

```json
{
    "can_interface": "vcan0",
    "rate": 250,
    "mqtt": {
        "topic": "test"
    }
}
```

Where the three specified values will override the default values specified in the config.model.json.

The passed config.model.json is checked with **[this json schema](https://github.com/eagletrt/code-generator/blob/master/source/lib/schemas/config.schema.json)**.

## The generators

The generators are the **typescript classes** that replace a certain **special comment** with the **generated code**.

### bson.generator

| Comment | Description | template example | compiled example |
| --- | --- | --- | --- |
| {{GENERATE_BSON}} | Generates the code of the function that given the structure variable, creates the bson object | [link](https://github.com/eagletrt/code-generator/blob/master/docs/example/structure_service/structure_bson.template.c) | [link](https://github.com/eagletrt/code-generator/blob/master/docs/example/structure_service/structure_bson.c) |

### structure-type.generator

| Comment | Description | template example | compiled example |
| --- | --- | --- | --- |
| {{GENERATE_STRUCTURE_TYPE}} | Generates the c struct representing the structure | [link](https://github.com/eagletrt/code-generator/blob/master/docs/example/structure_service/structure_type.template.h) | [link](https://github.com/eagletrt/code-generator/blob/master/docs/example/structure_service/structure_type.h) |

### structure-allocator.generator

| Comment | Description | template example | compiled example |
| --- | --- | --- | --- |
| {{GENERATE_STRUCTURE_ALLOCATOR}} | Generates the code of the function that allocates the structure | [link](https://github.com/eagletrt/code-generator/blob/master/docs/example/structure_service/structure_allocator.template.c) | [link](https://github.com/eagletrt/code-generator/blob/master/docs/example/structure_service/structure_allocator.c) |

### structure-deallocator.generator

| Comment | Description | template example | compiled example |
| --- | --- | --- | --- |
| {{GENERATE_STRUCTURE_DEALLOCATOR}} | Generates the code of the function that deallocates the structure | [link](https://github.com/eagletrt/code-generator/blob/master/docs/example/structure_service/structure_deallocator.template.c) | [link](https://github.com/eagletrt/code-generator/blob/master/docs/example/structure_service/structure_deallocator.c) |

### structure-can-gatherer-primary.generator

| Comment | Description | template example | compiled example |
| --- | --- | --- | --- |
| {{GENERATE_STRUCTURE_CAN_GATHERER_PRIMARY}} | Generates the code of the primary can gatherer | [link](https://github.com/eagletrt/code-generator/blob/master/docs/example/structure_service/can_gatherers/structure_can_gatherer_primary.template.c) | [link](https://github.com/eagletrt/code-generator/blob/master/docs/example/structure_service/can_gatherers/structure_can_gatherer_primary.c) |

### structure-can-gatherer-secondary.generator

| Comment | Description | template example | compiled example |
| --- | --- | --- | --- |
| {{GENERATE_STRUCTURE_CAN_GATHERER_SECONDARY}} | Generates the code of the secondary can gatherer | [link](https://github.com/eagletrt/code-generator/blob/master/docs/example/structure_service/can_gatherers/structure_can_gatherer_secondary.template.c) | [link](https://github.com/eagletrt/code-generator/blob/master/docs/example/structure_service/can_gatherers/structure_can_gatherer_secondary.c) |

### config-type.generator

| Comment | Description | template example | compiled example |
| --- | --- | --- | --- |
| {{GENERATE_CONFIG_TYPE}} | Generates the c struct representing the config | [link](https://github.com/eagletrt/code-generator/blob/master/docs/example/config_service/config_type.template.h) | [link](https://github.com/eagletrt/code-generator/blob/master/docs/example/config_service/config_type.h) |

### config-allocator.generator

| Comment | Description | template example | compiled example |
| --- | --- | --- | --- |
| {{GENERATE_CONFIG_ALLOCATOR}} | Generates the code of the function that allocates the config struct instance | [link](https://github.com/eagletrt/code-generator/blob/master/docs/example/config_service/config_allocator.template.c) | [link](https://github.com/eagletrt/code-generator/blob/master/docs/example/config_service/config_allocator.c) |

### config-deallocator.generator

| Comment | Description | template example | compiled example |
| --- | --- | --- | --- |
| {{GENERATE_CONFIG_DEALLOCATOR}} | Generates the code of the function that deallocates the config struct instance | [link](https://github.com/eagletrt/code-generator/blob/master/docs/example/config_service/config_deallocator.template.c) | [link](https://github.com/eagletrt/code-generator/blob/master/docs/example/config_service/config_deallocator.c) |

### config-print.generator

| Comment | Description | template example | compiled example |
| --- | --- | --- | --- |
| {{GENERATE_CONFIG_PRINT}} | Generates the code of the function that prints the config struct instance | [link](https://github.com/eagletrt/code-generator/blob/master/docs/example/config_service/config_print.template.c) | [link](https://github.com/eagletrt/code-generator/blob/master/docs/example/config_service/config_print.c) |

### config-parser.generator

| Comment | Description | template example | compiled example |
| --- | --- | --- | --- |
| {{GENERATE_CONFIG_PARSER}} | Generates the code of the functions that parses the given json file and assigns it to the config struct instance | [link](https://github.com/eagletrt/code-generator/blob/master/docs/example/config_service/config_parser.template.c) | [link](https://github.com/eagletrt/code-generator/blob/master/docs/example/config_service/config_parser.c) |

## API

// TODO: harrison deve fare le docs

Using **typedoc**, the documentation is published with **vercel** at [https://code-generator.eagletrt.vercel.sh](https://code-generator.eagletrt.vercel.sh).

The documentation for the mantainers is published with **vercel** at [https://code-generator-dev.eagletrt.vercel.sh](https://code-generator-dev.eagletrt.vercel.sh).

### generate

**Syntax:**

`generate(src, structure, options)`

**Description:**

Fetches all the template files in the given folder (files whose extension is preceded by .template) and generate the code inside the special comments (such as `//{{COMMENT}}`)

**Parameters:**

* __src__: Optional. The folder where the template files will be fetched from. The default is the current folder.
* __structureModel__: Optional. The path to the json file containing the structure model, used by generators to dynamically generate code about the data structure. The default is `structure.model.json`.
* __configModel__: Optional. The path to the json file containing the config model, used by generators to dynamically generate code about the config parser. The default is `config.model.json`.
* __options__: Optional. The options `object` specifying things such as logging, indentation and filters on the files

**Options parameters:**

* __exclude__: Default value: `/node_modules/`. A `RegExp` or an `array of RegExp` whose matching paths will be ignored.
* __extensions__: Default value: `undefined`. An `array of strings` representing the extensions that will be considered. By default all extensions will be considered.
* __log__: Default value: `true`. If the log will be shown on the terminal.
* __indent__: Default value: `true`. If the generated code will be indented the same as the comment it will substitute.

## Where was it used

This module was used in the telemetry sender [repo](https://github.com/eagletrt/fenice-telemetria-sender) of eagletrt.


<p align="center">
  <img src="https://github.com/eagletrt/code-generator/raw/master/docs/videos/demo.gif">
</p>

## Test

The tests were made by **[Nicola Toscan](https://github.com/NicolaToscan)** with **mocha** and **typescript**.

To run the tests execute:

```bash
npm run transpile
npm test
```

## Build

To build for production, using webpack:

```bash
npm run bundle
```

## Changelog

### Version 4

* The name of the package has been changed, from `@eagletrt/code-generator` to `@eagletrt/code-generator`. The bin script name has been changed from `eagle` to `eagle-cc` to avoid conflicts with the `@eagletrt/cli`.

### Version 3

* The generators for the can gatherers have been added.
* The structure schema has been changed in order to be able to add the can gatherers generators for fenice.
* It still supports chimera, but it has to use a slightly changed structure model syntax.

### Version 2

* The generators for the code that parses the config.json have been added.
* Json schemas for the validation of the json models given as inputs have been added.
* Tests have been added

### Version 1

The first version, that started by a javascript script in the main telemetry repository and have become this typescript package.

## Project structure

Made with [dree](https://github.com/eagletrt/dree)

```
code-generator
 ├── LICENSE
 ├── README.md
 ├─> bundled
 │   ├─> bin
 │   │   └── index.js
 │   └─> lib
 │       ├─> generators
 │       ├── index.d.ts
 │       └── index.js
 ├─> dist
 │   └─> source
 │       ├─> bin
 │       └─> lib
 ├─> docs
 │   ├─> directory-tree
 │   ├─> documentation
 │   │   ├─> html
 │   │   └─> html-dev
 │   ├─> example
 │   └─> videos
 ├── package-lock.json
 ├── package.json
 ├─> source
 │   ├─> bin
 │   │   └── index.ts
 │   ├─> lib
 │   │   ├─> generators
 │   │   │   ├─> bson
 │   │   │   │   └── bson.generator.ts
 │   │   │   ├─> config
 │   │   │   │   ├── config-allocator.generator.ts
 │   │   │   │   ├── config-deallocator.generator.ts
 │   │   │   │   ├── config-parser.generator.ts
 │   │   │   │   ├── config-print.generator.ts
 │   │   │   │   ├── config-type.generator.ts
 │   │   │   │   └── configGenerator.ts
 │   │   │   ├── index.ts
 │   │   │   └─> structure
 │   │   │       ├─> can-gatherer
 │   │   │       │   ├── structure-can-gatherer-primary.generator.ts
 │   │   │       │   ├── structure-can-gatherer-secondary.generator.ts
 │   │   │       │   └── structureCanGathererGenerator.ts
 │   │   │       ├── structure-allocator.generator.ts
 │   │   │       ├── structure-deallocator.generator.ts
 │   │   │       ├── structure-type.generator.ts
 │   │   │       └── structureGenerator.ts
 │   │   ├── index.ts
 │   │   ├─> schemas
 │   │   │   ├── config.schema.json
 │   │   │   └── structure.schema.json
 │   │   ├─> types
 │   │   │   ├─> config
 │   │   │   │   └── index.ts
 │   │   │   ├─> generator
 │   │   │   │   └── index.ts
 │   │   │   ├── index.ts
 │   │   │   ├─> options
 │   │   │   │   └── index.ts
 │   │   │   └─> structure
 │   │   │       └── index.ts
 │   │   └─> utils
 │   │       ├── checkModelsSchema.ts
 │   │       ├── getCodes.ts
 │   │       ├── logger.ts
 │   │       ├── options.ts
 │   │       ├── parseTemplate.ts
 │   │       └── transpile.ts
 │   └── tsconfig.json
 ├─> test
 ├── tsconfig.json
 ├── typedoc.dev.js
 ├── typedoc.js
 └── webpack.config.js
```
