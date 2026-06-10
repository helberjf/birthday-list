import assert from "node:assert/strict";
import { fromFirestoreFields, parseFirebasePrivateKey, toFirestoreFields } from "../../artifacts/api-server/src/lib/firebase-store";

const birthday = new Date("2026-06-08T12:30:00.000Z");

const original = {
  id: 7,
  parentName: "Ana",
  childName: null,
  active: true,
  rating: 4.5,
  birthday,
  colors: ["#ff00aa", "#00ffaa"],
  nested: {
    label: "Tema",
    order: 2,
  },
};

const fields = toFirestoreFields(original);
const roundtrip = fromFirestoreFields(fields);

assert.equal(roundtrip.id, original.id);
assert.equal(roundtrip.parentName, original.parentName);
assert.equal(roundtrip.childName, null);
assert.equal(roundtrip.active, true);
assert.equal(roundtrip.rating, 4.5);
assert.deepEqual(roundtrip.colors, original.colors);
assert.deepEqual(roundtrip.nested, original.nested);
assert.ok(roundtrip.birthday instanceof Date);
assert.equal(roundtrip.birthday.toISOString(), birthday.toISOString());

assert.equal(parseFirebasePrivateKey("-----BEGIN\\nKEY\\n-----END"), "-----BEGIN\nKEY\n-----END");

console.log("Firebase store field conversion checks passed.");
