import { expect } from 'chai'
import schema from './support/schema'
import treo from './support/treo'

describe('Transaction', () => {
  let db

  beforeEach(() => {
    db = treo('treo.database', schema)
  })

  afterEach(() => {
    return db.del()
  })

  it('has .mode property', () => {
    const tr1 = db.transaction(['books'], 'write')
    const tr2 = db.transaction(['storage', 'magazines'])
    expect(tr1.mode).equal('readwrite')
    expect(tr2.mode).equal('readonly')
  })

  it('validates scope', () => {
    const tr = db.transaction(['books'], 'read')
    expect(() => {
      tr.store('magazines')
    }).throws(/out of scope/)
  })

  it('is thenable', () => {
    const tr = db.transaction(['books'], 'write')
    expect(tr.then).a('function')
    expect(tr.catch).a('function')
    tr.store('books').put({ isbn: 'id1', title: 'Quarry Memories', author: 'Fred' })

    return tr.then(() => {
      return db.store('books').get('id1').then((book) => {
        expect(book).eql({ isbn: 'id1', title: 'Quarry Memories', author: 'Fred' })
        expect(tr.status).equal('complete')
      })
    })
  })

  it.skip('#abort', () => {
    const tr = db.transaction(['books', 'magazines'], 'write')
    tr.store('books').put({ isbn: 'id1', title: 'Quarry Memories', author: 'Fred' })
    tr.store('books').put({ isbn: 'id2', title: 'Bedrocky Nights', publisher: 'Bob' })
    tr.store('magazines').put({ id: 'id1', title: 'Quarry Memories', publisher: 'Bob' })

    return tr.abort().then(() => {
      return Promise.all([
        db.store('books').count(),
        db.store('magazines').count(),
      ]).then((results) => {
        expect(results[0]).equal(0)
        expect(results[1]).equal(0)
        expect(tr.status).equal('aborted')
      })
    })
  })

  it.skip('#on "abort"', (done) => {
    const tr = db.transaction(['magazines'], 'write')
    tr.store('magazines').put({ id: 'id1', title: 'Quarry Memories', publisher: 'Bob' })
    tr.abort()
    tr.on('abort', () => {
      expect(tr.status).equal('aborted')
      done()
    })
  })

  it('#on "complete"', (done) => {
    const tr = db.transaction(['books'], 'write')
    tr.store('books').put({ isbn: 'id1', title: 'Quarry Memories', author: 'Fred' })
    tr.on('complete', () => {
      expect(tr.status).equal('complete')
      done()
    })
  })

  it('#on "error"', (done) => {
    db.store('magazines').put({ publisher: 'Leanpub' }).then((key) => {
      const tr = db.transaction(['magazines'], 'write')
      tr.store('magazines').add(key, { publisher: 'Leanpub' }).then(() => {
        done('should be an error')
      })
      tr.on('error', () => {
        expect(tr.status).equal('error')
        done()
      })
    })
  })
})
