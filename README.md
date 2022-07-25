# Strukt.js

![a simple example of C/JS struct declaration](/media/banner-nobg.png)

I write this project to help myself explore WASM pottentials.
\
Most of the time when you deal with wasm memory, You want to read a complex data like a C++ class or a simple c struct.
To do that you need to master how to offset and use raw byte-array,
And for Complex use cases it will quickly become P.i.t.A.

It can run in almost all TS/JS runtimes ( browser / bun / nodejs / deno ).
\
It uses JS `DataView`s and `ArrayBuffer` to handle memory operations.
\
Because of that, it can handle unaligned layouts and endianess.

This project first idea came from [@Tsoding](https://github.com/tsoding) project [Elf.JS](https://github.com/tsoding/elf.js) which tries to parse elf64 binaries in browser.

# Concept
We can define our memory layout in JS/TS for a data type .
Then without any error or raw byte handling complxity access (R/W) data on to `ArrayBuffer`s.
\
It uses JS's `DataView`s to ensure cross platform abilities and *littleEndian*.

## What does it do?

You can define memory layout (like C-struct) to define how a byte-array data must be read from or wrote to.
```typescript
// TS / JS
const Ball = new Strukt('Ball', {
  'id' : 'u64',
  'posx': 'f32',
  'posy': 's16', 
  'target': ['s8', 5],
});
```

The above definition is equalant to C-struct bellow:
```c
// C / C++
typedef struct {
  unsigned long  long id,
  float               posx,
  signed   short int  posy, 
  signed   char       target[5],
} Ball;
```

Or in [V](https://github.com/vlang/v):
```v
struct Ball {
  id     u64
  posx   f32
  posy   s16
  target [5]i8
}
```
Any other language that generate c-style struct layout works as well.

# Install
To import the library in different runtimes, we need to use different methods.


For bun and nodejs , first we need to install it via a package manager (pnpm, yarn, npm) from npm repository:
```console
pnpm install struktjs
# or
yarn add struktjs
# or
npm i --save struktjs@latest
```

### Bun
Then in bun we can import `strukt.ts` file directly.
```typescript
// Bun
import {Strukt} from "struktjs/strukt.ts"; // typescript file
import {Strukt} from "struktjs"; // js file
```

### NodeJS
```javascript
// NodeJS esm module:
import {Strukt} from "struktjs";

// NodeJS commonjs:  NOT POSSIBLE right now
const {Strukt} = require("struktjs/index.cjs");
```



### Deno
In deno we can directly import the file.
\
Notice we can remove or change version (**@latest** in the URL) to get what you want.
\
like:
```typescript
// jsdelivr
import {Strukt} from "https://cdn.jsdelivr.net/npm/struktjs@latest/strukt.ts";
// or unpkg
import {Strukt} from "http://unpkg.com/struktjs@latest/strukt.ts";
// or github
import {Strukt} from "https://github.com/HKhademian/Strukt.js/raw/main/strukt.ts";
```

### Browser (modern)
Like deno, we need to use direct file import:
```html
<head>
  <script type="module">
    // jsdelivr
    import {Strukt} from "https://cdn.jsdelivr.net/npm/struktjs@latest/strukt.mjs";
    // or unpkg
    import {Strukt} from "http://unpkg.com/struktjs@latest/strukt.mjs";
    // or github
    import {Strukt} from "https://github.com/HKhademian/Strukt.js/raw/main/strukt.mjs";

    /* ......... REST OF LOGIC ......... */
  </script>
</head>
```

# How to use

Now we can read/write using `ArrayBuffer`s.
This `ArrayBuffer`s usually provided by WASM memory layouts.
\
For example see [tsoding/elf.js](https://github.com/tsoding/elf.js)
\
Then to parse that bare bytes, using previous defined `Ball` struct:

```typescript
const ballByteSize = ball.size; // sizeof(Ball) in c which gives bytesize of a Ball Strukt

const buf = new ArrayBuffer(ballByteSize*2);  // allocat memory for 2 ball obj


// ----- WRITE 2 balls in buf -----

// notice we can use BigInt, Number, even string to assign values
Ball.writeTo(buf, {
  'id' : 1, 
  'posx': 5.5,
  'posy': '5',
  'target': [1,2,3,4,5],
}, /*offset:*/0*ballByteSize);

Ball.writeTo(buf, {
  'id' : 2n,
  'posx': '6',
  'posy': 2,
  'target': [1,1,2,2,9],
}, /*offset:*/1*ballByteSize, /*littleEndian:*/false);


// ----- READ second ball from buf -----

const ball2 = Ball.readOneFrom(buf, /*offset:*/1*ballByteSize, /*littleEndian:*/false);

// READ first ball
const ball1 = Ball.readOneFrom(buf);
/* here ball1 uses BigInt for 'id' and Number for others */

// edit and rewite
ball1.posx += 10;
Ball.writeTo(buf, ball1);
```

# API Doc
```typescript
Strukt.prototype.constructor( schema ) // => a schema for strukt
// schema can be Object / Map / TuppleArray
// use Map in environments (like older browsers) to keep orders
// see (Map vs Object) bellow
// also you can use array of tuples [name, type][] instead.
// remmember TS's auto schema type detection for both Map and TuppleArray is ***not*** supported


Strukt.prototype.size // => get calculate bytesize of schema

Strukt.prototype.schema // => clone of strukt inner schema

Strukt.prototype.typeOf(fieldName) // => returns type of that field

Strukt.prototype.sizeOf(fieldName) // => returns bytesize of that field

Strukt.prototype.offsetOf(fieldName) // => returns bytesize offset from beginning of struct data

Strukt.prototype.write(record, offset=0, littleEndian?) // => create a new arrayBuffer with size of that record and `writeTo` it

Strukt.prototype.writeTo(buf, record, offset=0, littleEndian?) // => wites `record` data to `buf` start from `offset` with respect of `littleEndian`

Strukt.prototype.readOneFrom(buf, offset=0, littleEndian?) // => reads one record from buf 

Strukt.prototype.readAllFrom(buf, offset=0, count=1, littleEndian?) // => reads `count` records sequentialy from `buf`
```

# Map vs Object

see: [Map vs Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#objects_vs._maps)

in todays environments it's ok to use regular key/val dictionaries (JS Object) but in older definitions there is no garentee to keep entries order as it appears in src code.
\
So you can use js `Map` class to precise declaration in older environments.

# Typescript Types

This project source has developed in Typescript and transpiled to JavaScript.
Also you can use it in bare JS environments like browsers or nodejs,
But you can get type hints in typescript envs like bun/deno.
I will add type declaration for js later.

```Typescript
  const MyStrukt = new Strukt('my', {
    'a': ['u8',2],
    'b': 'ptr',
  });
  // auto calculation of Schema type in TS code

  type myStructType = typeof MyStrukt; 
  // = Strukt<type {'a': ['u8',2], 'b': 'ptr'}>
  
  type mySchemaType = SchemaOf<typeof MyStrukt>; 
  // = type {'a': ['u8',2], 'b': 'ptr'}
  
  type myRecordType = RecordOf<typeof MyStrukt>; 
  // = type {'a': number[], 'b': BigInt}
  // TODO: not completed yet

  const x: myRecordType = MyStrukt.readOneFrom(...);

  x[/*just `mySchemaType` keys (a / b)*/ 'a'];

  MyStrukt.sizeOf(/*just `mySchemaType` keys*/);
  MyStrukt.typeOf(/*just `mySchemaType` keys*/);
  MyStrukt.offsetOf(/*just `mySchemaType` keys*/);

  MyStrukt.write(record /*: myRecordType*/);
```

# Custom Type (Aliases)

There is a limit number of known numbers in `DataView` ( u8 , u16 , u32 , u64 , s8 , s16 , s32 , s64 , f32 , f64 )
\
So all we can do is to define aliases. like 'i8' <=> 's8', etc.

You can redefine inner type alises or add new ones to use in Strukt methods.

**Keep in mind that TS type system cannot handle these changes (you may need to use casting to ignore errors/warnings)**

```typescript
import {field_types_data} from 'strukt/strukt.ts';

// you can change default size type to use 32bit numbers
field_types_data['size'] = field_types_data['size32']; 

// or define your new type aliases
field_types_data['my_awesome_int'] = field_types_data['u16'];
```

# BigInt

Another thing to note is that in JS all numbers are floating-point.
And because of how they defined, they cannot hold 64bit integer range.
So you need too use `BigInt` to handle these large number ranges.

You can use any fitting number/string to write on records.
Just Keep it legal to use in Number/BigInt constructor.
\
If the value fits in, then there is no worry on how to write values in records.

When you read 64bit signed/unsigned integers it will return a `BigInt`.
Remember to cast it to `Number` when value ranges in 64bit float scope.

Like:
```typescript
ball1.posy = 100n; // BigInt variant of number 100 = BigInt(100) but `posy` needs a `Number`
ball1.id = '5'; // '5' is string (containing convertable value to bigint) but `id` type is `size <=> u64` which needs BigInt


const [posx, posy, id] = ball2
  // posx => Number (f32)
  // posy => Number (i16)
  // id => BigInt (ptr64)

let id32 = Number(id)

```

***For reading values from records (loaded from buffers) you may need to convert BigInt values to Number.***

## Future plan

I'd like to add support TS auto schema type detection for array of tupples input

## Contact

Feel free to send any bug reports, ideas, recommandations, and problems to issues/discussions section.

## Support
Plz if you want consider to support me with USDT/ETC/BTC.

**USDT-TRC20 (Tron net)   : TDqx4hDYJWZ3fhFytrKgfxLMA9165mMX3Y**
\
TRX-TRC10                 : TDqx4hDYJWZ3fhFytrKgfxLMA9165mMX3Y

USDT-ERC20 (Etherium net) : 0x8893fb935a3fff6c4e12633ade1d4a0f1223d3f8
\
USDT-BSC   (Binance net)  : 0x8893fb935a3fff6c4e12633ade1d4a0f1223d3f8

ETH-ERC20  (Etherium net) : 0x8893fb935a3fff6c4e12633ade1d4a0f1223d3f8
\
BTC        (Bitcoin net)  : 1Cy7xEAC4YXRRJLiaoeRDXUGdhnwq1FsqQ

