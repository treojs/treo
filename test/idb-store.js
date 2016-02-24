import { expect } from 'chai'
import { del } from 'idb-factory'
import { mapCursor } from 'idb-request'
import { takeRight } from 'idb-take'
import map from 'lodash.map'
import schema from './support/schema'
import treo from '../src'

describe('Store', () => {
  const dbName = 'treo.store'
  const data = {
    id1: { title: 'Quarry Memories', publisher: 'Bob' },
    id2: { title: 'Water Buffaloes', publisher: 'Bob' },
    id3: { title: 'Bedrocky Nights', publisher: 'Tim' },
    id4: { title: 'Waving Wings', publisher: 'Ken' },
  }
  let db

  beforeEach(async () => {
    db = await treo(dbName, schema.version(), schema.callback())
  })

  before(() => del(dbName))
  afterEach(() => del(db || dbName))

  it('#getters - "name", "key", "indexes"', () => {
    const books = db.store('books')
    expect(books.key).equal('isbn')
    expect(books.name).equal('books')
    expect(books.indexes).length(3)

    const magazines = db.store('magazines')
    expect(magazines.key).equal('id')
    expect(magazines.name).equal('magazines')
    expect(magazines.indexes).length(4)
  })

  it('#add([key], val) - add value by key', async () => {
    const key1 = await db.magazines.add({ title: 'Quarry Memories', publisher: 'Bob' })
    const key2 = await db.magazines.add({ title: 'Water Buffaloes', publisher: 'Bob' })

    expect(key1).equal(1)
    expect(key2).equal(2)
  })

  it('#put([key], val) - add or update value by key', async () => {
    const key1 = await db.books.put('id1', { title: 'Quarry Memories', author: 'Fred' })
    expect(key1).equal('id1')
    const book = await db.books.get('id1')
    expect(book.title).equal('Quarry Memories')
    expect(book.author).equal('Fred')

    const key2 = await db.magazines.put({ name: 'new magazine' })
    const magazine = await db.magazines.get(key2)
    expect(magazine.id).equal(key2)
    expect(magazine.name).equal('new magazine')

    const key3 = await db.storage1.put('key', 'value')
    expect(key3).equal('key')
    const val = await db.storage1.get('key')
    expect(val).equal('value')
  })

  it('#del(key) - delete value by key', async () => {
    await db.magazines.batch(data)
    await db.magazines.del('id1')

    expect(await db.magazines.get('id1')).equal(undefined)
    expect(await db.magazines.count()).equal(3)
  })

  it('#clear() - clear store', async () => {
    await db.magazines.batch(data)
    expect(await db.magazines.count()).equal(4)
    await db.magazines.clear()
    expect(await db.magazines.count()).equal(0)
  })

  it('#batch(ops)', async () => {
    await db.magazines.batch({
      id1: null,
      id3: { title: 'Bedrocky Nights', publisher: 'Bob' },
      id4: { title: 'Heavy Weighting', publisher: 'Bob' },
      id2: null,
    })
    expect(await db.magazines.count()).equal(2)
    expect((await db.magazines.get('id3')).publisher).equal('Bob')

    await db.storage1.batch([
      { type: 'add', key: 'foo', value: 'val 1' },
      { type: 'add', key: 'bar', value: 'val 2' },
      { type: 'add', key: 'baz', value: 'val 3' },
    ])
    expect(await db.storage1.get('bar')).equal('val 2')
    expect(await db.storage1.get('fake')).equal(undefined)
    expect(await db.storage1.count()).equal(3)
  })

  it('#get(key) - returns one record', async () => {
    await db.magazines.batch(data)
    expect((await db.magazines.get('id3')).title).equal('Bedrocky Nights')
    expect(await db.magazines.get('id5')).equal(undefined)
  })

  it('#getAll([range], [limit]) - return multiple records', async () => {
    await db.magazines.batch(data)

    const result1 = await db.magazines.getAll()
    expect(map(result1, 'id')).eql(['id1', 'id2', 'id3', 'id4'])

    const result2 = await db.magazines.getAll(null, 2)
    expect(map(result2, 'id')).eql(['id1', 'id2'])
  })

  it('#count([range]) - count values in range', async () => {
    await db.magazines.batch(data)
    expect(await db.magazines.count()).equal(4)
    expect(await db.magazines.count('id3')).equal(1)
    expect(await db.magazines.count({ gte: 'id2' })).equal(3)
  })

  it('#openCursor(range, [direction]) - proxy to native openCursor', async () => {
    await db.magazines.batch(data)
    const req = db.magazines.openCursor({ lte: 'id3' }, 'prevunique')
    const res1 = await mapCursor(req, (cursor, memo) => {
      memo.push(cursor.value)
      cursor.continue()
    })
    expect(map(res1, 'id')).eql(['id3', 'id2', 'id1'])

    const res2 = await takeRight(db.magazines, { lte: 'id3' })
    expect(res2).eql(res1)
  })
})
