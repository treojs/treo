// Copied from https://github.com/dfahlander/idb-iegap
/* eslint-disable */

if (navigator.userAgent.indexOf("Trident/") !== -1) (function (idb, undefined) {
    /* IndexedDB IE Gap polyfill (idb-iegap.js)
     *
     * VERSION: $Format:%d$
     *
     * Gaps if IE10 and IE11:
     *      * The lack of support for compound indexes
     *      * The lack of support for compound primary keys
     *      * The lack of support for multiEntry indexes
     *      * Always returning false from property IDBObjectStore.autoIncrement
     *
     *
     * Where to inject?
     *
     *      Everything that is implemented is marked with a "V" below:
     *
     *      V IDBObjectStore.createIndex(name, [keyPath1, keypath2], { unique: true/false, multiEntry: true });
     *          What to do?
     *              1) If keyPath is an array, create a new table ($iegap-<table>-<indexName> with autoinc, key "key" (unique?) and value "primKey" of this table
     *                 If multiEntry is true, create a new table ($iegap-<table>-<indexName> with autoinc, key "key" and value "primKey" of this table.
     *              2) Dont create the real index but store the index in localStorage key ("$iegap-<table>")
     *                  { indexes: [{name: "", keyPath, ...
     *      V IDBObjectStore.deleteIndex()
     *      V IDBObjectStore.index("name")
     *          V If the name corresponds to a special index, return a fake IDBIndex with its own version of openCursor()
     *      V IDBObjectStore.add():
     *          V If we have compound indexes, make sure to also add an item in its table if add was successful. Return a fake request that resolves when both requests are resolved
                  V Ignore but log error events occurring when adding index keys
     *          V If we have multiEntry indexes, make sure to also interpret the array and add all its items. Same rule as above.
     *      V IDBObjectStore.put():
     *          V First delete all indexed-items bound to this primary key, then do the add.
     *      V IDBObjectStore.delete(): Delete all indexed items bound to this primary key.
     *      V IDBObjectStore.clear(): Clear all meta stores bound to this object store.
     *      V IDBKeyRange.*: Allow arrays and store them in range.compound value.
     *      V IEGAPIndex.openKeyCursor():
     *          V compound: Iterate the own table, use a fake cursor object to point out correct primary key
     *      V IEGAPIndex.openCursor():
     *          V compound: Iterate the own table, use a fake cursor object to point out correct primary key and value
     *          V IEGapCursor.delete(): delete the object itself along with the index objects pointing to it. HOW WILL IE REACT WHEN SAWING OF ITS OWN BRANCH IN AN ITERATION. We might have to restart the query with another upperBound/lowerBound request.
     *          V IEGapCursor.update(): Do a put() on the object itself. WHAT HAPPENS IF PUT/DELETE results in deleting next-coming iterations? We might have to restart the quer with another upperBound/lowerBound request.
     *          V Support nextunique and prevunique by just using it on the index store.
     *      V IDBDatabase.transaction(): Make sure to include all meta-tables for included object stores.
     *      V IDBDatabase.deleteObjectStore(): Delete the meta-indexe object stores and update the meta-table.
     *      V Detect IE10/IE11.
     *
     *  Over-course:
     *      V IDBObjectStore.indexNames: Return the compound result of real indexNames and the ones in $iegap-<table>-indexes
     *      V IDBDatabase.objectStoreNames: Filter away those names that contain metadata
     *      V indexedDB.open(): extend the returned request and override onupgradeneeded so that main meta-table is created
     *      V                            "                               onsuccess so that the main meta-table is read into a var stored onto db.
     *      V IDBTransaction.objectStore(): Populate the "autoIncrement" property onto returned objectStore. Need to have that stored if so.
     *      V readyState in IEGAPRequest
     */
    function extend(obj, extension) {
        if (typeof extension !== 'object') extension = extension(); // Allow to supply a function returning the extension. Useful for simplifying private scopes.
        Object.keys(extension).forEach(function(key) {
            obj[key] = extension[key];
        });
        return obj;
    }

    function derive(Child) {
        return {
            from: function(Parent) {
                Child.prototype = Object.create(Parent.prototype);
                Child.prototype.constructor = Child;
                return {
                    extend: function(extension) {
                        extend(Child.prototype, typeof extension !== 'object' ? extension(Parent.prototype) : extension);
                    }
                };
            }
        };
    }

    function override(orig, overrider) {
        if (typeof orig === 'object')
            // map of properties to override
            Object.keys(overrider).forEach(function (prop) {
                var pd = Object.getOwnPropertyDescriptor(orig, prop);
                var newPd = overrider[prop](pd);
                if (newPd.hasOwnProperty('value') && newPd.writable !== false) newPd.writable = true;
                Object.defineProperty(orig, prop, extend({ configurable: true, enumerable: true }, newPd));
            });
        else
            // simple function
            return overrider(orig);
    }

    function getByKeyPath(obj, keyPath) {
        // http://www.w3.org/TR/IndexedDB/#steps-for-extracting-a-key-from-a-value-using-a-key-path
        if (obj.hasOwnProperty(keyPath)) return obj[keyPath]; // This line is moved from last to first for optimization purpose.
        if (!keyPath) return obj;
        if (typeof keyPath !== 'string') {
            var rv = [];
            for (var i = 0, l = keyPath.length; i < l; ++i) {
                var val = getByKeyPath(obj, keyPath[i]);
                rv.push(val);
            }
            return rv;
        }
        var period = keyPath.indexOf('.');
        if (period !== -1) {
            var innerObj = obj[keyPath.substr(0, period)];
            return innerObj === undefined ? undefined : getByKeyPath(innerObj, keyPath.substr(period + 1));
        }
        return undefined;
    }

    function setByKeyPath(obj, keyPath, value) {
        if (!obj || keyPath === undefined) return;
        if (Array.isArray(keyPath)) {
            for (var i = 0, l = keyPath.length; i < l; ++i) {
                setByKeyPath(obj, keyPath[i], value[i]);
            }
        } else {
            var period = keyPath.indexOf('.');
            if (period !== -1) {
                var currentKeyPath = keyPath.substr(0, period);
                var remainingKeyPath = keyPath.substr(period + 1);
                if (remainingKeyPath === "")
                    if (value === undefined) delete obj[currentKeyPath]; else obj[currentKeyPath] = value;
                else {
                    var innerObj = obj[currentKeyPath];
                    if (!innerObj) innerObj = (obj[currentKeyPath] = {});
                    setByKeyPath(innerObj, remainingKeyPath, value);
                }
            } else {
                if (value === undefined) delete obj[keyPath]; else obj[keyPath] = value;
            }
        }
    }

    function delByKeyPath(obj, keyPath) {
        setByKeyPath(obj, keyPath, undefined);
    }

    function ignore(op, cb) {
        return function (ev) {
            console.log("Warning: IEGap polyfill failed to " + (op.call ? op() : op) + ": " + ev.target.error);
            ev.stopPropagation();
            ev.preventDefault();
            cb();
            return false;
        }
    }

    function addCompoundIndexKey(idxStore, indexSpec, value, primKey, rollbacks, onfinally) {
        /// <param name="idxStore" type="IDBObjectStore">The object store for meta-indexes</param>
        try {
            var idxKeys = getByKeyPath(value, indexSpec.keyPath);
            if (idxKeys === undefined) return onfinally(); // no key to add index for
            var req = idxStore.add({ fk: primKey, k: compoundToString(idxKeys) });
            req.onerror = ignore("add compound index", onfinally);
            req.onsuccess = function (ev) {
                if (rollbacks) rollbacks.push({store: idxStore, del: true, pk: ev.target.result});
                onfinally();
            };
        } catch (ex) {
            console.log("IEGap polyfill exception when adding compound index key");
            onfinally();
        }
    }

    function addMultiEntryIndexKeys(idxStore, indexSpec, value, primKey, rollbacks, onfinally) {
        /// <param name="idxStore" type="IDBObjectStore">The object store for meta-indexes</param>
        try {
            var idxKeys = getByKeyPath(value, indexSpec.keyPath);
            if (idxKeys === undefined) return onfinally(); // no key to add index for.
            if (!Array.isArray(idxKeys)) {
                // the result of evaluating the index's key path doesn't yield an Array
                var req = idxStore.add({ fk: primKey, k: idxKeys });
                req.onerror = ignore("add index", onfinally);
                req.onsuccess = function(ev) {
                    if (rollbacks) rollbacks.push({store: idxStore, del: true, pk: ev.target.result});
                    onfinally();
                }
            } else {
                // the result of evaluating the index's key path yields an Array
                idxKeys.forEach(function(idxKey) {
                    var req2 = idxStore.add({ fk: primKey, k: idxKey });
                    req2.onerror = ignore(function() { return "add multiEntry index " + idxKey + " for " + indexSpec.storeName + "." + indexSpec.keyPath ; }, checkComplete);
                    req2.onsuccess = function(ev) {
                        if (rollbacks) rollbacks.push({ store: idxStore, del: true, pk: ev.target.result });
                        checkComplete();
                    }
                });

                var nRequests = idxKeys.length;
                function checkComplete() {
                    if (--nRequests === 0) onfinally();
                }
            }
        } catch (ex) {
            console.log("IEGap polyfill exception when adding multientry key");
        }
    }

    function bulkDelete(index, key, onfinally) {
        /// <param name="index" type="IDBIndex"></param>
        /// <param name="key"></param>
        var cursorReq = index.openKeyCursor(key);
        var primKeys = [];
        cursorReq.onerror = ignore("list indexed references", onfinally);
        cursorReq.onsuccess = function (ev) {
            var cursor = cursorReq.result;
            if (!cursor) return doDelete();
            primKeys.push(cursor.primaryKey);
            cursor.continue();
        }

        function doDelete() {
            var store = index.objectStore;
            primKeys.forEach(function (primKey) {
                var req = store.delete(primKey);
                req.onerror = ignore("delete meta index", checkComplete);
                req.onsuccess = checkComplete;
            });
            var nRequests = primKeys.length;
            if (nRequests === 0) onfinally();
            function checkComplete() {
                if (--nRequests === 0) onfinally();
            }
        }
    }

    function bulk(operations, cb, log) {
        /// <summary>
        ///     Execute given array of operations and the call given callback
        /// </summary>
        /// <param name="operations" value="[{store: IDBObjectStore.prototype, del:false, pk: null, obj: null}]">Operations to execute</param>
        /// <param name="cb" type="Function"></param>
        var nRequests = operations.length;
        operations.forEach(function (item) {
            var req = (item.del ? item.store.delete(item.pk) : (item.pk ? item.store.add (item.obj, item.pk) : item.store.add (item.obj)));
            req.onerror = ignore(log || "executing bulk", checkComplete);
            req.onsuccess = checkComplete;
        });
        function checkComplete() {
            if (--nRequests === 0 && cb) cb();
        }
    }


    //
    // Constants and imports
    //
    var POWTABLE = {};
    var IDBKeyRange = window.IDBKeyRange,
        IDBObjectStore = window.IDBObjectStore,
        IDBDatabase = window.IDBDatabase;

    function initPowTable() {
        for (var i = 4; i >= -4; --i) {
            POWTABLE[i] = Math.pow(32768, i);
        }
    }

    function unipack(number, intChars, floatChars) {
        /// <summary>
        ///     Represent the number as a unicode string keeping the sort
        ///     order of the Number instance intact when comparing the
        ///     resulting string.
        /// </summary>
        /// <param name="number" type="Number">Number to represent as sort-order kept unicode string</param>
        /// <param name="intChars" type="Number">Number of unicode chars that should represent the integer part of given Number.
        /// Each unicode char will hold 15 bits (16 - 1, since 0000 is an unusable char making us lose one bit of info per char.</param>
        /// <param name="floatChars" type="Number">Number of unicode chars that should represent the floating point decimals of
        /// given Number instance. Each char will hold 15 bits.</param>
        var currPow = intChars - 1,
            xor = number < 0 ? 32767 : 0,
            unsignedNumber = number < 0 ? -number : number,
            rv = "";

        while (currPow >= -floatChars) {
            var val = ((unsignedNumber / POWTABLE[currPow]) & 32767) ^ xor;
            var charCode = (val << 1) | 1;
            rv += String.fromCharCode(charCode);
            --currPow;
        }

        return rv;
    }

    function uniback(unicode, intChars, floatChars, negate) {
        /// <summary>
        ///
        /// </summary>
        /// <param name="unicode" type="String"></param>
        /// <param name="intChars"></param>
        /// <param name="floatChars"></param>
        var rv = 0,
            currPow = intChars - 1,
            l = unicode.length;
        if (intChars + floatChars != l) return undefined;

        for (var i = 0; i < l; ++i) {
            var val = ((unicode.charCodeAt(i) - 1) >> 1);
            if (negate)
                rv -= POWTABLE[currPow] * (val ^ 32767);
            else
                rv += POWTABLE[currPow] * val;
            --currPow;
        }
        return rv;
    }

    function compoundToString(a) {
        /// <param name="a" type="Array"></param>
        var l = a.length,
            rv = new Array(l);
        for (var i = 0; i < l; ++i) {
            var part = a[i];
            if (part instanceof Date)
                rv[i] = "D" + unipack(part.getTime(), 4, 0);
            else if (typeof part === 'string')
                rv[i] = "S" + part;
            else if (isNaN(part))
                if (part)
                    rv[i] = "J" + JSON.stringify(part);
                else if (typeof part === 'undefined')
                    rv[i] = "u" // undefined
                else
                    rv[i] = "0" // null
            else
                rv[i] = (part < 0 ? "N" : "n") + unipack(part, 5, 4);
        }
        return JSON.stringify(rv);
    }

    function stringToCompound(s) {
        var a = JSON.parse(s),
            l = a.length,
            rv = new Array(l);
        for (var i = 0; i < l; ++i) {
            var item = a[i];
            var type = item[0];
            var encoded = item.substr(1);
            var value = undefined;
            if (type === "D")
                value = new Date(uniback(encoded, 4, 0));
            else if (type === "J")
                value = JSON.parse(encoded);
            else if (type === "S")
                value = encoded;
            else if (type === "N")
                value = uniback(encoded, 5, 4, true);
            else if (type === "n")
                value = uniback(encoded, 5, 4, false);
            else if (type === "u")
                value = undefined;
            else if (type === "0")
                value = null
            rv[i] = value;
        }
        return rv;
    }

    function getMeta(db) {
        /// <param name="db" type="IDBDatabase"></param>
        /// <returns value="{stores: {storeName: {metaStores: [], indexes: {indexName: {name:'',keyPath:null,multiEntry:false,unique:false,compound:false,idxStoreName:'',storeName:''}}, compound: false, keyPath: ['a','b.c']}}}"></returns>
        return db._iegapmeta;
    }
    function setMeta(db, transaction, value) {
        /// <param name="db" type="IDBDatabase"></param>
        /// <param name="transaction" type="IDBTransaction"></param>
        db._iegapmeta = value;
        transaction.objectStore('$iegapmeta').put(value, 1);
    }

    function parseKeyParam(key) {
        if (Array.isArray(key)) return compoundToString(key);
        if (key instanceof IEGAPKeyRange) {
            var upper = Array.isArray(key.upper) ? compoundToString(key.upper) : key.upper,
                lower = Array.isArray(key.lower) ? compoundToString(key.lower) : key.lower;
            if (key.lower === null)
                return IDBKeyRange.upperBound(upper, key.upperOpen);
            if (key.upper === null)
                return IDBKeyRange.lowerBound(lower, key.lowerOpen);
            return IDBKeyRange.bound(
                lower,
                upper,
                !!key.lowerOpen,
                !!key.upperOpen);
        }
        return key;
    }

    function IEGAPIndex(idbIndex, idbStore, name, keyPath, multiEntry) {
        this._idx = idbIndex;
        this._store = idbStore;
        this._compound = Array.isArray(keyPath);
        this._multiEntry = multiEntry;
        this.keyPath = keyPath;
        this.name = name;
        this.objectStore = idbStore;
        this.unique = idbIndex.unique;
    }

    derive(IEGAPIndex).from(Object).extend(function() {
        function openCursor(iegIndex, range, dir, includeValue) {
            /// <param name="iegIndex" type="IEGAPIndex"></param>
            /// <param name="range" type="IDBKeyRange"></param>
            /// <param name="dir" type="String"></param>
            return new IEGAPRequest(iegIndex, iegIndex.objectStore.transaction, function (success, error) {
                var compound = iegIndex._compound,
                    compoundPrimKey = Array.isArray(iegIndex.objectStore.keyPath);
                if (compound && Array.isArray(range)) range = new IEGAPKeyRange(range, range);
                var idbRange = compound && range ?
                    IDBKeyRange.bound(compoundToString(range.lower), compoundToString(range.upper), range.lowerOpen, range.upperOpen) :
                    range;

                if (typeof idbRange === 'undefined') idbRange = null;
                var req = iegIndex._idx.openCursor(idbRange, dir);
                req.onerror = error;
                if (includeValue) {
                    req.onsuccess = function(ev) {
                        var cursor = ev.target.result;
                        if (cursor) {
                            var getreq = iegIndex._store.get(cursor.value.fk);
                            getreq.onerror = error;
                            getreq.onsuccess = function () {
                                if (!getreq.result) return cursor.continue(); // An index is about to be deleted but it hasnt happened yet.
                                var key = compound ? stringToCompound(cursor.key) : cursor.key;
                                var primKey = compoundPrimKey ? stringToCompound(cursor.value.fk) : cursor.value.fk;
                                success(ev, new IEGAPCursor(cursor, iegIndex, iegIndex.objectStore, primKey, key, getreq.result));
                            }
                        } else {
                            success(ev, null);
                        }
                    }
                } else {
                    req.onsuccess = function(ev) {
                        var cursor = ev.target.result;
                        var key = compound ? stringToCompound(cursor.key) : cursor.key;
                        var primKey = compoundPrimKey ? stringToCompound(cursor.value.fk) : cursor.value.fk;
                        success(ev, cursor && new IEGAPCursor(cursor, iegIndex, iegIndex.objectStore, primKey, key));
                    }
                }
            });
        }

        return {
            count: function (key) {
                if (arguments.length > 0) arguments[0] = parseKeyParam(key);
                return this._idx.count.apply(this._idx, arguments);
            },
            get: function(key) {
                var thiz = this;
                var req = this._idx.get(parseKeyParam(key));
                return new IEGAPRequest(this, this.objectStore.transaction, function(success, error) {
                    // First request the meta-store for this index
                    req.onsuccess = function(ev) {
                        // Check if key was found.
                        var foreignKey = req.result && req.result.fk;
                        if (foreignKey) {
                            // Key found. Do a new request on the origin store based on the foreignKey found in meta-store.
                            req = thiz.objectStore.get(foreignKey);
                            req.onsuccess = function () {
                                success(ev, req.result);
                            }
                            req.onerror = error;
                        } else {
                            // Key not found. Just forward the undefined-found index.
                            success(ev);
                        }
                    }
                    req.onerror = error;
                });
            },
            getKey: function(key) {
                var thiz = this;
                var req = this._idx.get(parseKeyParam(key));
                return new IEGAPRequest(this, this.objectStore.transaction, function (success, error) {
                    req.onsuccess = function (ev) {
                        var res = ev.target.result;
                        success(ev, res && res.fk);
                    }
                    req.onerror = error;
                });
            },
            openKeyCursor: function(range, dir) {
                return openCursor(this, range, dir);
            },
            openCursor: function(range, dir) {
                return openCursor(this, range, dir, true);
            }
        };
    });

    function IEGAPCursor(idbCursor, source, store, primaryKey, key, value) {
        this._cursor = idbCursor;
        this._store = store;
        this.direction = idbCursor.direction;
        this.key = key;
        this.primaryKey = primaryKey;
        this.source = source;
        if (arguments.length >= 6) this.value = value;
    }

    extend(IEGAPCursor.prototype, function() {
        return {
            advance: function(n) {
                this._cursor.advance(n);
            },
            "continue": function(key) {
                /// <param name="key" optional="true"></param>
                if (!key) return this._cursor.continue();
                if (Array.isArray(key)) return this._cursor.continue(compoundToString(key));
                return this._cursor.continue(key);
            },
            "delete": function () {
                return this._store.delete(this.primaryKey);// Will automatically delete and iegap index items as well.
                // req.target will be the object store and not the cursor. Let it be so for now.
                // TODO: Låtsas som det regnar och fortsätt här. Testa sedan vad som händer om man deletar
                // ett objekt som resulterar i att en massa multiValue indexes deletas och därmed att
                // cursor.continue falierar eller beter sig märkligt. Kanske är det upp till implementatören att vänta på delete() requestet eller?
                // Hur beter sig IDB i detta läge (de som har stöd för multiValue index)?
            },
            update: function(newValue) {
                // Samma eventuella problem här som med delete(). Frågan är var ansvaret ligger för att inte fortsätta jobba med
                // en collection som håller på att manipuleras. API usern eller IDB?
                return this._store.keyPath ? this._store.put(newValue) : this._store.put(newValue, this.primaryKey);
            }
        }
    });

    function IEGAPEventTarget() {
        this._el = {};
    }

    extend(IEGAPEventTarget.prototype, function() {
        return {
            addEventListener: function (type, listener) {
                this._el[type] ? this._el[type].push(listener) : this._el[type] = [listener];
            },
            removeEventListener: function (type, listener) {
                var listeners = this._el[type];
                if (listeners) {
                    var pos = listeners.indexOf(listener);
                    if (pos !== -1) listeners.splice(pos, 1);
                }
            },
            dispatchEvent: function (event) {
                var listener = this["on" + event.type];
                if (listener && listener(event) === false) return false;
                var listeners = this._el[event.type];
                if (listeners) {
                    for (var i = 0, l = listeners.length; i < l; ++i) {
                        listener = listeners[i];
                        if ((listener.handleEvent || listener)(event) === false) return false;
                    }
                    return true;
                }
            }
        }
    });

    //
    // IEGAP version of IDBRequest
    //
    function IEGAPRequest(source, transaction, deferred) {
        this._el = {};
        this.source = source;
        this.transaction = transaction;
        this.readyState = "pending";
        var thiz = this;
        var eventTargetProp = { get: function () { return thiz; } };
        deferred(function (e, result) {
            thiz.result = result;
            Object.defineProperty(e, "target", eventTargetProp);
            thiz.readyState = "done";
            thiz.dispatchEvent(e);
        }, function (e, err) {
            thiz.error = err || e.target.error;
            Object.defineProperty(e, "target", eventTargetProp);
            thiz.readyState = "done";
            if (e.type != "error") {
                Object.defineProperty(e, "type", { get: function() { return "error"; } });
            }
            thiz.dispatchEvent(e);
        }, this);
    }
    derive(IEGAPRequest).from(IEGAPEventTarget).extend({
        onsuccess: null,
        onerror: null,
    });

    //
    // IDBOpenRequest
    //
    function IEGAPOpenRequest() {
        IEGAPRequest.apply(this, arguments);
    }
    derive(IEGAPOpenRequest).from(IEGAPRequest).extend({
        onblocked: null,
        onupgradeneeded: null
    });


    //
    // Our IDBKeyRange
    //

    function IEGAPKeyRange(lower, upper, lowerOpen, upperOpen) {
        this.lower = lower;
        this.upper = upper;
        this.lowerOpen = lowerOpen;
        this.upperOpen = upperOpen;
    }

    //
    // Our DOMStringList
    //

    function IEGAPStringList(a) {
        Object.defineProperties(a, {
            contains: {
                configurable: true, writable: true, value: function (str) {
                    return a.indexOf(str) !== -1;
                }
            },
            item: {
                configurable: true, writable: true, value: function (index) {
                    return a[index];
                }
            }
        });
        return a;
    }

    function Constructor() {

        var getObjectStoreNames = Object.getOwnPropertyDescriptor(IDBDatabase.prototype, "objectStoreNames").get;
        //var getIndexNames = Object.getOwnPropertyDescriptor(IDBObjectStore.prototype, "indexNames").get;
        var deleteObjectStore = IDBDatabase.prototype.deleteObjectStore;
        var createObjectStore = IDBDatabase.prototype.createObjectStore;

        initPowTable();

        //
        // Inject into onupgradeneeded and onsuccess in indexedDB.open()
        //
        idb.open = override(idb.open, function(orig) {
            return function (name, version) {
                var req = orig.apply(this, arguments);
                return new IEGAPOpenRequest(this, null, function (success, error, iegReq) {
                    req.onerror = error;
                    req.onblocked = function(ev) { iegReq.dispatchEvent(ev); };
                    req.onupgradeneeded = function (ev) {
                        iegReq.transaction = req.transaction;
                        var db = (iegReq.result = req.result);
                        db._upgradeTransaction = req.transaction; // Needed in IDBDatabase.prototype.deleteObjectStore(). Save to set like this because during upgrade transaction, no other transactions may live concurrently.
                        db._iegapmeta = { stores: {} };
                        if (!getObjectStoreNames.apply(db).contains("$iegapmeta")) {
                            var store = createObjectStore.call(db, "$iegapmeta");
                            store.add(db._iegapmeta, 1);
                        }
                        ev.target = ev.currentTarget = iegReq;
                        iegReq.dispatchEvent(ev);
                    }
                    req.onsuccess = function(ev) {
                        var db = req.result;
                        delete db._upgradeTransaction;
                        db._iegapmeta = { stores: {} }; // Until we have loaded the correct value, we need db.transaction() to work.
                        try {
                            var trans = db.transaction(["$iegapmeta"], 'readonly');
                            var req2 = trans.objectStore("$iegapmeta").get(1);
                            req2.onerror = error;
                            req2.onsuccess = function() {
                                db._iegapmeta = req2.result;
                                success(ev, db);
                            }
                        } catch (e) {
                            error(ev, e);
                        }
                    }
                });
            }
        });

        //
        // Inject into window.IDBKeyRange
        //

        IDBKeyRange.bound = override(IDBKeyRange.bound, function(orig) {
            return function bound(lower, upper, lopen, oopen) {
                if (!Array.isArray(lower)) return orig.apply(this, arguments);
                return new IEGAPKeyRange(lower, upper, lopen, oopen);
            }
        });

        IDBKeyRange.lowerBound = override(IDBKeyRange.lowerBound, function(orig) {
            return function lowerBound(bound, open) {
                if (!Array.isArray(bound)) return orig.apply(this, arguments);
                return new IEGAPKeyRange(bound, null, open, null);
            }
        });

        IDBKeyRange.upperBound = override(IDBKeyRange.upperBound, function(orig) {
            return function upperBound(bound, open) {
                if (!Array.isArray(bound)) return orig.apply(this, arguments);
                return new IEGAPKeyRange(null, bound, null, open);
            }
        });

        IDBKeyRange.only = override(IDBKeyRange.only, function(orig) {
            return function only(val) {
                if (!Array.isArray(val)) return orig.apply(this, arguments);
                return new IEGAPKeyRange(val, val);
            }
        });

        //
        // Inject into window.IDBObjectStore
        //
        IDBObjectStore.prototype.count = override(IDBObjectStore.prototype.count, function(orig) {
            return function (key) {
                if (arguments.length > 0) arguments[0] = parseKeyParam(key);
                return orig.apply(this, arguments);
            }
        });

        IDBObjectStore.prototype.get = override(IDBObjectStore.prototype.get, function(orig) {
            return function(key) {
                if (arguments.length > 0) arguments[0] = parseKeyParam(key);
                return orig.apply(this, arguments);
            }
        });

        IDBObjectStore.prototype.openCursor = override(IDBObjectStore.prototype.openCursor, function(orig) {
            return function (range, dir) {
                /// <param name="range" type="IDBKeyRange"></param>
                /// <param name="dir" type="String"></param>
                var meta = this.transaction.db._iegapmeta.stores[this.name];
                if (!meta) return orig.apply(this, arguments);
                if (Array.isArray(range)) range = new IEGAPKeyRange(range, range);
                var compound = meta.compound;
                if (compound && range && !(range instanceof IEGAPKeyRange)) throw new RangeError("Primary key is compound but given range is not.");
                var idbRange = compound && range ?
                    IDBKeyRange.bound(compoundToString(range.lower), compoundToString(range.upper), range.lowerOpen, range.upperOpen) :
                    range;
                arguments[0] = idbRange;
                var req = orig.apply(this, arguments);
                var store = this;
                return new IEGAPRequest(this, this.transaction, function(success, error) {
                    req.onerror = error;
                    req.onsuccess = function (ev) {
                        var cursor = ev.target.result;
                        if (cursor) {
                            var key = compound ? stringToCompound(cursor.key) : cursor.key;
                            var iegapCursor = new IEGAPCursor(cursor, store, store, key, key, cursor.value);
                            success(ev, iegapCursor);
                        } else {
                            success(ev, null);
                        }
                    }
                });
            }
        });

        IDBObjectStore.prototype.createIndex = override(IDBObjectStore.prototype.createIndex, function (origFunc) {

            function createIndex(store, name, keyPath, props) {
                /// <summary>
                ///
                /// </summary>
                /// <param name="store" type="IDBObjectStore"></param>
                /// <param name="name"></param>
                /// <param name="keyPath"></param>
                /// <param name="props" value="{unique: true, multiEntry: true}"></param>
                var db = store.transaction.db;
                var idxStoreName = "$iegap-" + store.name + "-" + name;
                var meta = db._iegapmeta;
                if (props.multiEntry && Array.isArray(keyPath)) {
                    // IDB spec require us to throw DOMException.INVALID_ACCESS_ERR
                    createObjectStore.call(db, "dummy", { keyPath: "", autoIncrement: true }); // Will throw DOMException.INVALID_ACCESS_ERR
                    throw "invalid access"; // fallback.
                }
                var idxStore = createObjectStore.call(db, idxStoreName, { autoIncrement: true });

                var storeMeta = meta.stores[store.name] || (meta.stores[store.name] = {indexes: {}, metaStores: [] });
                var indexMeta = {
                    name: name,
                    keyPath: keyPath,
                    multiEntry: props.multiEntry || false,
                    unique: props.unique || false,
                    compound: Array.isArray(keyPath),
                    storeName: store.name,
                    idxStoreName: idxStoreName
                };
                storeMeta.indexes[name] = indexMeta;
                storeMeta.metaStores.push(idxStoreName);
                idxStore.createIndex("fk", "fk", { unique: false });
                var keyIndex = idxStore.createIndex("k", "k", { unique: props.unique || false });
                setMeta(db, store.transaction, meta);

                // Reindexing existing data:
                if (!store._reindexing) {
                    store._reindexing = true;
                    store.openCursor().onsuccess = function (e) {
                        delete store._reindexing;
                        var cursor = e.target.result;
                        if (cursor) {
                            cursor.update(cursor.value); // Will call out version of IDBObjectStore.put() that will re-index all items!
                            cursor.continue();
                        }
                    }
                }
                return new IEGAPIndex(keyIndex, store, name, keyPath, props.multiEntry);
            }

            return function (name, keyPath, props) {
                if (Array.isArray(keyPath) || (props && props.multiEntry))
                    return createIndex(this, name, keyPath, props || {});
                return origFunc.apply(this, arguments);
            }
        });

        IDBObjectStore.prototype.deleteIndex = override(IDBObjectStore.prototype.deleteIndex, function(origFunc) {
            return function(name) {
                var db = this.transaction.db;
                var meta = db._iegapmeta;
                var storeMeta = meta.stores[this.name];
                if (!storeMeta) return origFunc.apply(this, arguments);
                var indexMeta = storeMeta.indexes[name];
                if (!indexMeta) return origFunc.apply(this, arguments);
                deleteObjectStore.call(db, indexMeta.idxStoreName);
                delete storeMeta.indexes[name];
                setMeta(db, this.transaction, meta);
            }
        });

        IDBObjectStore.prototype.index = override(IDBObjectStore.prototype.index, function(origFunc) {

            return function (indexName) {
                var meta = this.transaction.db._iegapmeta.stores[this.name];
                if (!meta) return origFunc.apply(this, arguments);
                var idx = meta.indexes[indexName];
                return idx ?
                    new IEGAPIndex(this.transaction.objectStore(idx.idxStoreName).index("k"), this, idx.name, idx.keyPath, idx.multiEntry) :
                    origFunc.apply(this, arguments);
            };
        });

        IDBObjectStore.prototype.add = override(IDBObjectStore.prototype.add, function (origFunc) {
            return function(value, key) {
                var meta = this.transaction.db._iegapmeta.stores[this.name];
                if (!meta) return origFunc.apply(this, arguments);
                var addReq;
                if (meta.compound) {
                    // Compound primary key
                    // Key must not be provided when having inbound keys (compound is inbound)
                    if (key) return this.add(null); // Trigger DOMException(DataError)!
                    key = compoundToString(getByKeyPath(value, meta.keyPath));
                    addReq = origFunc.call(this, value, key);
                } else {
                    addReq = origFunc.apply(this, arguments);
                }
                var indexes = Object.keys(meta.indexes);
                if (!meta.compound && indexes.length === 0) return addReq; // No indexes to deal with
                var store = this;
                return new IEGAPRequest(this, this.transaction, function(success, error) {
                    var addEvent = null, errorEvent = null, indexAddFinished = false, rollbacks = [];
                    var primKey = key || (store.keyPath && getByKeyPath(value, store.keyPath));
                    if (!primKey) {
                        addReq.onerror = error;
                        addReq.onsuccess = function(ev) {
                            addEvent = ev;
                            primKey = addReq.result;
                            addIndexKeys();
                        }
                    } else {
                        // Caller provided primKey - we can start adding indexes at once! No need waiting for onsuccess. However, this means we may need to rollback our stuff...
                        // So, why do it in such a complex way? Because otherwise we fail on a W3C web-platform-test where an item is added and then expected its index to be there the line after.
                        addIndexKeys();
                        addReq.onerror = function(ev) {
                            errorEvent = ev;
                            ev.preventDefault(); // Dont abort transaction quite yet. First roll-back our added indexes, then when done, call the real error eventhandler and check if it wants to preventDefault or not.
                            checkFinally();
                        }
                        addReq.onsuccess = function(ev) {
                            addEvent = ev;
                            checkFinally();
                        }
                    }

                    function checkFinally() {
                        if (indexAddFinished && (addEvent || errorEvent))
                            if (errorEvent) {
                                var defaultPrevented = false;
                                errorEvent.preventDefault = function () { defaultPrevented = true; };
                                error(errorEvent);
                                if (!defaultPrevented) store.transaction.abort(); // We prevented default in the first place. Now we must manually abort when having called the event handler
                            } else
                                success(addEvent, meta.compound ? stringToCompound(addReq.result) : addReq.result);
                    }

                    function addIndexKeys() {
                        var nRequests = indexes.length;
                        indexes.forEach(function (indexName) {
                            var indexSpec = meta.indexes[indexName];
                            var idxStore = store.transaction.objectStore(indexSpec.idxStoreName);
                            if (indexSpec.multiEntry) {
                                addMultiEntryIndexKeys(idxStore, indexSpec, value, primKey, rollbacks, checkComplete);
                            } else if (indexSpec.compound) {
                                addCompoundIndexKey(idxStore, indexSpec, value, primKey, rollbacks, checkComplete);
                            } else {
                                throw "IEGap assert error";
                            }
                        });

                        function checkComplete() {
                            if (--nRequests === 0) {
                                if (!errorEvent) {
                                    indexAddFinished = true;
                                    checkFinally();
                                } else {
                                    bulk(rollbacks, function() {
                                        indexAddFinished = true;
                                        checkFinally();
                                    }, "rolling back index additions");
                                }
                            }
                        }
                    }
                });
            }
        });

        IDBObjectStore.prototype.put = override(IDBObjectStore.prototype.put, function (origFunc) {
            return function (value, key) {
                var meta = this.transaction.db._iegapmeta.stores[this.name];
                if (!meta) return origFunc.apply(this, arguments);
                var putReq;
                if (meta.compound) {
                    // Compound primary key
                    // Key must not be provided when having inbound keys (compound is inbound)
                    if (key) return this.add(null); // Trigger DOMException(DataError)!
                    key = compoundToString(getByKeyPath(value, meta.keyPath));
                    putReq = origFunc.call(this, value, key);
                } else {
                    putReq = origFunc.apply(this, arguments);
                }
                var indexes = Object.keys(meta.indexes);
                if (!meta.compound && indexes.length === 0) return putReq;
                var store = this;
                return new IEGAPRequest(this, this.transaction, function (success, error) {
                    var putEvent = null;
                    var primKey;
                    putReq.onerror = error;
                    putReq.onsuccess = function (ev) {
                        putEvent = ev;
                        primKey = putReq.result;
                        replaceIndexKeys();
                    }

                    function replaceIndexKeys() {
                        var nRequests = indexes.length;
                        indexes.forEach(function(indexName) {
                            var indexSpec = meta.indexes[indexName];
                            var idxStore = store.transaction.objectStore(indexSpec.idxStoreName);
                            bulkDelete(idxStore.index("fk"), primKey, function () {
                                // then, when deleted, add entries:
                                if (indexSpec.multiEntry) {
                                    addMultiEntryIndexKeys(idxStore, indexSpec, value, primKey, null, checkComplete);
                                } else if (indexSpec.compound) {
                                    addCompoundIndexKey(idxStore, indexSpec, value, primKey, null, checkComplete);
                                } else {
                                    checkComplete();
                                    throw "IEGap assert error";
                                }
                            });
                        });

                        function checkComplete() {
                            if (--nRequests === 0) success(putEvent, meta.compound ? stringToCompound(primKey) : primKey);
                        }
                    }
                });
            }
        });

        IDBObjectStore.prototype.delete = override(IDBObjectStore.prototype.delete, function (origFunc) {
            return function (key) {
                var meta = this.transaction.db._iegapmeta.stores[this.name];
                if (!meta) return origFunc.apply(this, arguments);
                if (meta.compound) {
                    // Compound primary key
                    key = compoundToString(key);
                }
                var delReq = origFunc.call(this, key);
                var indexes = Object.keys(meta.indexes);
                if (indexes.length == 0) return delReq;
                var store = this;
                return new IEGAPRequest(this, this.transaction, function (success, error) {
                    var delEvent = null;
                    delReq.onerror = error;
                    delReq.onsuccess = function(ev) {
                        delEvent = ev;
                        deleteIndexKeys();
                    }

                    function deleteIndexKeys() {
                        var nRequests = indexes.length;
                        indexes.forEach(function (indexName) {
                            var indexSpec = meta.indexes[indexName];
                            var idxStore = store.transaction.objectStore(indexSpec.idxStoreName);
                            bulkDelete(idxStore.index("fk"), key, checkComplete);
                        });

                        function checkComplete() {
                            if (--nRequests === 0) success(delEvent);
                        }
                    }
                });
            }
        });

        IDBObjectStore.prototype.clear = override(IDBObjectStore.prototype.clear, function(origFunc) {
            return function() {
                var clearReq = origFunc.apply(this, arguments);
                var meta = this.transaction.db._iegapmeta.stores[this.name];
                if (!meta) return clearReq;
                var store = this;
                return new IEGAPRequest(this, this.transaction, function(success, error) {
                    var indexes = Object.keys(meta.indexes);
                    var clearEvent = null;
                    clearReq.onerror = error;
                    clearReq.onsuccess = function(ev) {
                        clearEvent = ev;
                        clearIndexStores();
                    }

                    function clearIndexStores() {
                        var nRequests = indexes.length;
                        if (nRequests === 0) return success(clearEvent);
                        indexes.forEach(function (indexName) {
                            var indexSpec = meta.indexes[indexName];
                            var idxStore = store.transaction.objectStore(indexSpec.idxStoreName);
                            var idxClearReq = idxStore.clear();
                            idxClearReq.onerror = ignore("clearing meta store", checkComplete);
                            idxClearReq.onsuccess = checkComplete;
                        });

                        function checkComplete() {
                            if (--nRequests === 0) success(clearEvent);
                        }
                    }
                });
            }
        });

        override(IDBObjectStore.prototype, {
            indexNames: function (origPropDescriptor) {
                return {
                    get: function() {
                        var rv = [].slice.call(origPropDescriptor.get.apply(this));
                        var meta = this.transaction.db._iegapmeta.stores[this.name];
                        if (meta) rv = rv.concat(Object.keys(meta.indexes));
                        return new IEGAPStringList(rv);
                    }
                }
            },
            autoIncrement: function(orig) {
                return {
                    get: function() {
                        var meta = this.transaction.db._iegapmeta.stores[this.name];
                        return meta && 'autoIncrement' in meta ? meta.autoIncrement : orig.get.call(this);
                    }
                }
            },
            keyPath: function(orig) {
                return {
                    get: function () {
                        var meta = this.transaction.db._iegapmeta.stores[this.name];
                        return meta && 'keyPath' in meta ? meta.keyPath : orig.get.call(this);
                    }
                }
            }
        });

        //
        // Inject into window.IDBDatabase
        //
        override(IDBDatabase.prototype, {
            transaction: function(origPropDescriptor) {
                return {
                    value: function(storeNames, mode) {
                        storeNames = typeof storeNames == 'string' ? [storeNames] : [].slice.call(storeNames);
                        var storesWithMeta = this._iegapmeta.stores;
                        storeNames.forEach(function (name) {
                            var meta = storesWithMeta[name];
                            if (meta) storeNames = storeNames.concat(meta.metaStores);
                        });
                        return origPropDescriptor.value.call(this, storeNames, mode || "readonly");
                    }
                };
            },
            objectStoreNames: function(origPropDescriptor) {
                return {
                    get: function() {
                        return new IEGAPStringList([].slice.call(origPropDescriptor.get.apply(this)).filter(
                            function(storeName) {
                                return storeName.indexOf('$iegap') !== 0;
                            }
                        ));
                    }
                }
            },
            createObjectStore: function(origPropDescriptor) {
                return {
                    value: function (storeName, props) {
                        /// <summary>
                        ///   Hook into when object stores are create so that we
                        ///   may support compound primary keys.
                        /// </summary>
                        /// <param name="storeName" type="String"></param>
                        /// <param name="props" optional="true" value="{keyPath: [], autoIncrement: false}"></param>
                        /// <returns type="IDBObjectStore"></returns>
                        var rv, compound = false;
                        if (!props || !Array.isArray(props.keyPath)) {
                            rv = origPropDescriptor.value.apply(this, arguments);
                        } else {
                            compound = true;
                            if (props.autoIncrement) throw new RangeError("Cannot autoincrement compound key");
                            // Caller provided an array as keyPath. Need to polyfill:
                            // Create the ObjectStore without inbound keyPath:
                            rv = origPropDescriptor.value.call(this, storeName);
                        }
                        // Then, store the keyPath array in our meta-data:
                        var meta = this._iegapmeta;
                        var storeMeta = meta.stores[storeName] || (meta.stores[storeName] = { indexes: {}, metaStores: [] });
                        storeMeta.keyPath = (props && props.keyPath) || null;
                        storeMeta.compound = compound;
                        storeMeta.autoIncrement = (props && props.autoIncrement) || false;
                        setMeta(this, rv.transaction, meta);
                        return rv;
                    }
                }
            },
            deleteObjectStore: function (origPropDescriptor) {
                return {
                    value: function (storeName) {
                        origPropDescriptor.value.call(this, storeName);
                        var meta = this._iegapmeta;
                        var storeMeta = meta.stores[storeName];
                        if (!storeMeta) return;
                        storeMeta.metaStores.forEach(function(metaStoreName) {
                            origPropDescriptor.value.call(this, metaStoreName);
                        });
                        delete meta.stores[storeName];
                        if (!this._upgradeTransaction) throw "assert error"; // In case we're not in upgrade phase, first call to origPropDescriptor.value.call(storeName) would can thrown already.
                        setMeta(this, this._upgradeTransaction, meta);
                    }
                }
            }
        });
    }

    Constructor();
})(window.indexedDB || window.msIndexedDB);
