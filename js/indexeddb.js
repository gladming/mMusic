let DB_NAME = 'myMusic';
let DB_VERSION = localStorage.DB_VERSION ? localStorage.DB_VERSION : 1;

/**
 * 数据库版本升级
 */
function dbVersionUp() {
    DB_VERSION++;
    localStorage.DB_VERSION = DB_VERSION;
}

/**
 * 打开数据库
 * @returns {Promise<any>}
 */
function openDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onsuccess = function (e) {
            resolve(e.target.result);
        };
        request.onerror = function (e) {
            reject(e);
            console.log('打开数据库失败:', e);
        };
        request.onupgradeneeded = function (e) {
            const db = e.target.result;
            initDb(db);
            resolve(db);
        }
    });
}

/**
 * 初始化数据库
 * @param db 打开的数据库
 */
function initDb(db) {
    //播放列表
    if (!db.objectStoreNames.contains('playList')) {
        const objectStore = db.createObjectStore('playList', {
            keyPath: 'mid',
        });
        objectStore.createIndex('name', 'name', {
            unique: false
        });
    }
    //缓存列表
    if (!db.objectStoreNames.contains('cacheList')) {
        const objectStore = db.createObjectStore('cacheList', {
            keyPath: 'id',
        });
        objectStore.createIndex('mime', 'mime', {
            unique: false
        });
        objectStore.createIndex('ext', 'ext', {
            unique: false
        });
    }
    //歌词列表
    if (!db.objectStoreNames.contains('lyricList')) {
        const objectStore = db.createObjectStore('lyricList', {
            keyPath: 'id',
        });
        objectStore.createIndex('source', 'source', {
            unique: false
        });
    }
}

/**
 * 读取表数据
 * @param table 表名
 * @param value 主键值
 * @returns {Promise<any>}
 */
function queryGet(table, value) {
    return new Promise((resolve, reject) => {
        openDb().then(db => {
            const tx = db.transaction(table, 'readwrite');
            const store = tx.objectStore(table);
            const req = store.get(value);
            req.onsuccess = res => {
                console.log(table + ':数据读取成功');
                resolve(res.target.result);
            };
            req.onerror = res => {
                console.log(table + ':数据读取失败'+res.target.error);
                reject();
            };
        }).catch(error=>{
            console.log(error);
        });
    });
}

/**
 * 查询出所有数据
 * @param table 表名
 * @param callback 回调函数
 * @returns {*}
 */
function queryGetAll(table) {
    return new Promise((resolve, reject) => {
        var res = [];
        openDb().then(db => {
            const tx = db.transaction(table, 'readwrite');
            const store = tx.objectStore(table);
            const req = store.openCursor();
            req.onsuccess = e => {
                var cursor = e.target.result;
                if (cursor) {
                    res.push(cursor.value);
                    cursor.continue();
                } else {
                    console.log("查询" + table + "表中所有数据成功");
                    resolve(res);
                    db.close();
                }
            };
            req.onerror = e => {
                console.log(table + ':数据读取失败'+e.target.error);
                resolve(res);
            };
        }).catch(error=>{
            console.log(error);
            resolve(res);
        });
    });
}

/**
 * 添加表数据
 * @param table 表名
 * @param data 数据
 * @returns {Promise<any>}
 */
function addTable(table, data) {
    console.log(data);
    return new Promise((resolve, reject) => {
        openDb().then(db => {
            if (!db.objectStoreNames.contains(table)) {
                dbVersionUp();
                addTable(table,data);
                return;
            }
            const tx = db.transaction(table, 'readwrite');
            const store = tx.objectStore(table);
            const req = store.add(data);
            req.onsuccess = res => {
                console.log(table + ':数据保存成功', res);
                resolve(res);
            };
            req.onerror = res => {
                console.log(table + ':数据保存失败'+res.target.error);
                reject();
            };

        }).catch(error=>{
            console.log(error);
        });
    });
}

/**
 * 批量缓存
 * @param cacheList 缓存文件列表
 */
function addFileCache(cacheList) {
    if(!cacheList)return;
    mui.each(cacheList,function (k,v) {
        if(!v.url)return true;
        queryGet('cacheList',v.id).then(function (e) {
            console.log(e);
            if(e){
                return;
            }
            getFileToBlob(v.id,v.url);
        },function () {
            getFileToBlob(v.id,v.url);
        });
    });
}

/**
 * 添加或更新表数据
 * @param table 表名
 * @param data 数据
 * @returns {Promise<any>}
 */
function updateTable(table, data) {
    console.log(data);
    return new Promise((resolve, reject) => {
        openDb().then(db => {
            if (!db.objectStoreNames.contains(table)) {
                dbVersionUp();
                updateTable(table,data);
                return;
            }
            const tx = db.transaction(table, 'readwrite');
            const store = tx.objectStore(table);
            const req = store.put(data);
            req.onsuccess = res => {
                console.log(table + ':数据保存成功', res);
                resolve(res);
            };
            req.onerror = res => {
                console.log(table + ':数据保存失败'+res.target.error);
                reject();
            };
        }).catch(error=>{
            console.log(error);
        });
    });
}

function getFileToBlob(id,url) {
    var ext=(function (e) {
        if(e){
            return e[e.length-1];
        }else{
            return '.'+getMime(url).split('/')[1];
        }
    })(url.match(/\.([0-9A-Za-z]+)/g));
    // Create XHR
    var xhr = new XMLHttpRequest(),
        blob;

    xhr.open("GET", url, true);
    // Set the responseType to blob
    xhr.responseType = "blob";

    xhr.addEventListener("load", function () {
        if (xhr.status === 200) {
            console.log("Image retrieved");

            // File as response
            blob = xhr.response;console.log(blob)

            // Put the received blob into IndexedDB
            updateTable('cacheList',{
                blob:blob,
                id:id,
                ext:ext,
                mime:blob.type
            });
        }
    }, false);
    // Send XHR
    xhr.send();
}

function transBlobToUrl(blob) {
    console.log('读取缓存成功');
    // Get window.URL object
    var URL = window.URL || window.webkitURL;

    // Create and revoke ObjectURL
    var fileURL = URL.createObjectURL(blob);
    // Revoking ObjectURL
    //URL.revokeObjectURL(fileURL);
    if(blob.type.indexOf('image')>-1){
        Config.cachePic=fileURL;
    }
    if(blob.type.indexOf('audio')>-1){
        Config.cacheAudio=fileURL;
    }

    return fileURL;
}
