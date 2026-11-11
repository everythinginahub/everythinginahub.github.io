import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDieGeometry} from '../scripts/dice-renderer.js';

test('each supported die is a finite convex solid with the correct number of numbered faces',()=>{
 const expected={4:{faces:4,vertices:[3]},6:{faces:6,vertices:[4]},8:{faces:8,vertices:[3]},10:{faces:10,vertices:[4]},12:{faces:12,vertices:[5]},20:{faces:20,vertices:[3]},100:{faces:100,vertices:[3,4]}};
 for(const [sidesText,spec] of Object.entries(expected)){
  const sides=Number(sidesText),{geometry,faces}=createDieGeometry(sides),values=faces.map(face=>face.value).sort((a,b)=>a-b),positions=geometry.getAttribute('position'),normals=geometry.getAttribute('normal');
  try{
   assert.equal(faces.length,spec.faces,`d${sides} face count`);assert.deepEqual(values,Array.from({length:sides},(_,i)=>i+1));assert.ok(faces.every(face=>spec.vertices.includes(face.points.length)));assert.equal(geometry.groups.length,sides);assert.ok(Number.isFinite(geometry.boundingSphere.radius));
   for(let i=0;i<positions.count;i++){assert.ok(Number.isFinite(positions.getX(i)));assert.ok(Number.isFinite(positions.getY(i)));assert.ok(Number.isFinite(positions.getZ(i)));assert.ok(Number.isFinite(normals.getX(i)));assert.ok(Number.isFinite(normals.getY(i)));assert.ok(Number.isFinite(normals.getZ(i)));}
   assert.ok(geometry.groups.every(group=>group.materialIndex>=0&&group.materialIndex<6));
  }finally{geometry.dispose();}
 }
});
test('the six-sided die keeps standard opposite faces and dots',()=>{
 const {geometry,faces}=createDieGeometry(6);try{
  const face=(axis,sign)=>faces.find(item=>item.normal[axis]*sign>.99);
  assert.equal(face('z',1).value,1);assert.equal(face('z',-1).value,6);assert.equal(face('x',1).value,5);assert.equal(face('x',-1).value,2);assert.equal(face('y',1).value,3);assert.equal(face('y',-1).value,4);
 }finally{geometry.dispose();}
});
test('d10 is a ten-faced trapezohedron rather than a cube',()=>{
 const {geometry,faces}=createDieGeometry(10);try{assert.equal(faces.length,10);assert.ok(faces.every(face=>face.points.length===4));assert.equal(new Set(faces.map(face=>face.points.length)).size,1);}finally{geometry.dispose();}
});
