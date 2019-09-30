var api='http://47.112.4.147:86/music/api.php';
let Config={
    cacheAudio:null,
    cachePic:null
};

//缓存
function cache(url){
    var ext=(function (e) {
        if(e){
            return e[e.length-1];
        }else{
            return '.'+getMime(url).split('/')[1];
        }
    })(url.match(/\.([0-9A-Za-z]+)/g));
	var filename=md5(url)+ext;
	var savePath='_downloads/music/' + filename;
    var filepath=url;
    mui.plusReady(function () {
        //判断文件是否已经下载
        plus.io.resolveLocalFileSystemURL(
            savePath,
            function (entry) {//如果已存在文件，则打开文件
                if (entry.isFile) {
                    console.log('文件已存在');
                }
            }, function () {//如果未下载文件，则下载后打开文件
                console.log('开始')
                var dtask = plus.downloader.createDownload(filepath, { filename: savePath }, function (d, status) {
                    console.log(d)
                    if (status == 200) {
                        console.log('下载成功');
                        //plus.runtime.openFile('_downloads/' + filename);
                    }
                    else {
                        mui.toast("下载失败: " + status);
                    }
                });
                dtask.addEventListener("statechanged", function (task, status) {
                    if (!dtask) { return; }
                    switch (task.state) {
                        case 1:
                            mui.toast("开始下载...");
                            break;
                        case 2:
                            mui.toast("正在下载...");
                            break;
                        case 3: // 已接收到数据
                            var progressVal = (task.downloadedSize / task.totalSize) * 100;
                            console.log('下载进度：'+parseInt(progressVal) + '%')
                            break;
                        case 4:
                            dtask = null;
                            if (mui('.progress')[0].length > 0) {
                                mui('.progress')[0].innerHTML='0%';
                            }
                            mui.toast("正在打开文件...");
                            break;
                    }
                });
                dtask.start();
            }
        );
    });
}

/**
 * 获取扩展名
 * @param dist
 * @returns {Promise<any>}
 */
async function getMime(dist) {
    return await new Promise(function(resolve,reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', dist);
        xhr.responseType = 'blob';
        xhr.onreadystatechange = function() {
            if(xhr.readyState == 4) {
                if((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304) {
                    resolve(xhr.response.type);console.log(xhr.response)
                }else{
                    reject();
                }
            }
        };
        xhr.send();
    });
}
