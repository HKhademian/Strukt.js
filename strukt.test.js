import { Strukt, getFieldTypeSize, } from "./strukt"; // deno need .ts ending
console.debug(getFieldTypeSize('u8'), getFieldTypeSize('i8'), getFieldTypeSize('ptr'), getFieldTypeSize('str'), getFieldTypeSize('i32'), getFieldTypeSize(['u8', 10]));
const Student1 = new Strukt('Student1', {
    name: 'u8',
    age: 'u16',
    isAlive: 'bool',
    isMale: 'bool',
});
console.log(Student1, Student1.size, Student1.sizeOf('age'), Student1.sizeOf("isAlive"));
const Student2 = new Strukt('Student2', { test: 'bool', ...Student1.schema, 'end': 'ptr' });
// notice that we can edit schema of existing strukt for another strukt
console.log(Student2, Student2.size, Student2.sizeOf('age'), Student2.sizeOf("isAlive"));
const Teacher = new Strukt('Teacher', {
    'id': 'u8',
    'align_id': ['u8', 5],
    'index': 'u32',
    'age': 'u8',
});
console.log(Teacher, Teacher.size, Teacher.sizeOf('age'), Teacher.sizeOf('id'));
const buf = new ArrayBuffer(Teacher.size);
const u8buf = new Uint8Array(buf);
u8buf.fill(-1); // 0xFF
console.log(u8buf);
for (let i = 0; i < buf.byteLength; ++i) {
    u8buf[i] = i + 74;
}
const teacher = Teacher.readFrom(buf);
console.log('random write', u8buf);
console.log('random read', teacher);
teacher.age = 26;
teacher.index = 5;
teacher.id = 2;
console.log('edit', teacher);
Teacher.writeTo(buf, teacher);
console.log(u8buf);
console.log('read again', Teacher.readFrom(buf));
