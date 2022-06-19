# Strukt.js

I write this project to help myself explore WASM pottentials.

This project first idea came from [@Tsoding](https://github.com/tsoding) project [Elf.JS](https://github.com/tsoding/elf.js) which tries to parse elf64 binaries in browser.

It can run in JS(browser/nodejs/deno) and TS.
\
It uses JS `DataView` and `ArrayBuffer` to handle memory operations.
\
Because of that, it can handle unaligned layouts and endianess.

## What does it do?

You can define memory layout (like C-struct) to define how a byte-array data must be read from or wrote to.

```typescript
// Deno
import {Strukt} from "https://github.com/HKhademian/Strukt.js/raw/main/index.mjs";

// NodeJS esm (mjs file):
import {Strukt} from "struktjs/index.mjs";

// NodeJS commonjs: 
/* NOT POSSIBLE */ const {Strukt} = require("struktjs/index.mjs");*/


const Ball = new Strukt('Ball', {
  'id' : 'size', // default to U64 , but you can use size16 and size32
  'posx': 'float',
  'posy': 's16',
  'target': ['s8', 5],
});
```

The above definition is equalant to C-struct bellow:

```c
typedef struct {
  unsigned long  long id,
  float               posx,
  signed   short int  posy, 
  signed   char       target[]
} Ball;
```

## How to use

Now you can read/write using `ArrayBuffer`s.

```typescript
const ballByteSize = ball.size; // bytesize of Ball Strukt
const buf = new ArrayBuffer(ballByteSize*2);  // allocat memory for 2 ball obj


// ----- WRITE 2 balls in buf -----

Ball.writeTo(buf, {
  'id' : 1, // default to U64 , but you can use size16 and size32
  'posx': 5.5,
  'posy': 5,
  'target': [1,2,3,4,5],
}, /*offset:*/0*ballByteSize);

Ball.writeTo(buf, {
  'id' : 2, // default to U64 , but you can use size16 and size32
  'posx': '6',
  'posy': 2,
  'target': [1,1,2,2,9],
}, /*offset:*/1*ballByteSize, /*littleEndian:*/false);


// ----- READ second ball from buf -----

const ball2 = Ball.readFrom(buf, /*offset:*/1*ballByteSize, /*littleEndian:*/false);

// READ first ball
const ball1 = Ball.readFrom(buf);

// edit and rewite
ball1.posx += 10;
Ball.writeTo(buf, ball1);
```

## Functions

```typescript
Strukt.prototype.constructor( schema ) // => a schema for strukt , use Map in environments (like older browsers) to keep orders
// see: [Map vs Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#objects_vs._maps)
// also you can use array of tuples [name, type][] instead.
// TS auto schema type detection for both Map and TuppleArray is ***not*** supported


Strukt.prototype.size // => get calculate bytesize of schema

Strukt.prototype.schema // => clone of strukt inner schema

Strukt.prototype.typeOf(fieldName) // => returns type of that field

Strukt.prototype.sizeOf(fieldName) // => returns bytesize of that field

Strukt.prototype.offsetOf(fieldName) // => NOT_IMPLEMENTED_YET: returns bytesize offset from beginning of struct data

Strukt.prototype.write(record, offset=0, littleEndian?) // => create a new arrayBuffer with size of that record and `writeTo` it

Strukt.prototype.writeTo(buf, record, offset=0, littleEndian?) // => wites `record` data to `buf` start from `offset` with respect of `littleEndian`

Strukt.prototype.readFrom(buf, offset=0, count=null, littleEndian?) // => reads `count` records sequentialy from `buf`, 
// if count=null then a record object returned
// if count=number then an array of records returned
```

## Map vs Object

see: [Map vs Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#objects_vs._maps)

in todays environments it's ok to use regular key/val dictionaries (JS Object) but in older definitions there is no garentee to keep entries order as it appears in src code.

## Typescript Types

This project source has developed in Typescript and transpiled to JavaScript.
Also you can use it in bare JS environments like browsers or nodejs,
But you can get type hints in typescript envs like deno.

```Typescript
  const MyStrukt = new Strukt('my', {
    'a': ['u8',2],
    'b': 'ptr',
  }); // auto calculation of Schema type

  type myStructType = typeof MyStrukt; // = Strukt<type {'a': ['u8',2], 'b': 'ptr'}>
  type mySchemaType = SchemaOf<typeof MyStrukt>; // = type {'a': ['u8',2], 'b': 'ptr'}
  type myRecordType = RecordOf<typeof MyStrukt>; // = type {'a': number[], 'b': BigInt}

  const x: myRecordType|myRecordType[] = MyStrukt.readFrom(...);

  x[/*just `mySchemaType` keys*/];

  MyStrukt.sizeOf(/*just `mySchemaType` keys*/);
  MyStrukt.typeOf(/*just `mySchemaType` keys*/);
  MyStrukt.offsetOf(/*just `mySchemaType` keys*/);

  MyStrukt.write(record: myRecordType);
```

## Custom Type (Aliases)

As we knew, there is a limit number of known numbers to `DataView` ( [signed, unsigned]x[8,16,32,64] which gives us 8 decimal and 2 floating-point numbers )
\
So all we can do is to define aliases. like 'i8' <=> 's8', etc.

You can redefine inner type alises or add new ones to use in Strukt methods.

**Keep in mind that TS type system cannot handle these changes (you may need to use casting to ignore errors/warnings)**

```typescript
import {field_types_data} from '<some_path_to_lib>/strukt.ts';

field_types_data['size'] = field_types_data['size32']; // change default size type to use 32bit numbers

field_types_data['my_awesome_int'] = field_types_data['u16'];
```

## BigInt

Another thing to note is that in JS all numbers are floating-point.
\
And because of how they defined, they cannot hold 64bit integer.
\
So you need too use `BigInt` to handle these large number ranges.
\
But int this library use can use any fitting number/string.
Just Keep it legal to use in Number/BigInt constructor.
If the value fits in, then there is no worry on how to write values in records.

Like:
```typescript
ball1.posy = 100n; // BigInt variant of number 100 = BigInt(100) but `posy` needs a `Number`
ball1.id = '5'; // '5' is string (containing convertable value to bigint) but `id` type is `size <=> u64` which needs BigInt


const [posx, posy, id] = ball2
  // posx => Number (floating)
  // posy => Number (integer)
  // posx => BigInt (pointer)
```

***For reading values from records (loaded from buffers) you may need to convert BigInt values to Number or wiseversa.***

## Future plan

I'd like to add support TS auto schema type detection for array of tupples input

## Contact

Feel free to send any bug reports, ideas, recommandations, and problems to issues section.

## Support

My best part :) of this project.
\
Plz if you want consider to support me with USDT/ETC/BTC

**USDT-TRC20 (Tron net)   : TDqx4hDYJWZ3fhFytrKgfxLMA9165mMX3Y**
\
TRX-TRC10                 : TDqx4hDYJWZ3fhFytrKgfxLMA9165mMX3Y

USDT-ERC20 (Etherium net) : 0x8893fb935a3fff6c4e12633ade1d4a0f1223d3f8
\
USDT-BSC   (Binance net)  : 0x8893fb935a3fff6c4e12633ade1d4a0f1223d3f8

ETH-ERC20  (Etherium net) : 0x8893fb935a3fff6c4e12633ade1d4a0f1223d3f8
\
BTC        (Bitcoin net)  : 1Cy7xEAC4YXRRJLiaoeRDXUGdhnwq1FsqQ

