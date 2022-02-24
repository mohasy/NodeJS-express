var express = require("express");
var server = express();
var fs = require("fs");
var multer = require("multer");
var uploadMw = multer({dest:"./upload"});

// 미들웨어 정의
server.use(express.static("./statics"));

//urlencoded 미들웨어 정의
//경고문구를 없애고 싶다면 express.urlencoded({extends:true})
server.use(express.urlencoded());

//글 쓰기 처리
//uploadMw() - 업로드된 첨부파일을 저장하는 미들웨어
server.post("/write", uploadMw.single("attach"), function(req, res, next) {
    //기존에 작성되어 있던 게시물들을 불러온다.
    var articles =JSON.parse(fs.readFileSync("articles.json").toString());
    //사용자가 작성한 새 게시물을 덧붙인다.
    var article = {
        subject: req.body.subject, 
        writer: req.body.writer, 
        content: req.body.content, 
        regdt: new Date(), 
        hitcount: 0
    }
    //첨부파일이 존재하면 첨부파일도 저장
    if(req.file) {
        article.attach = req.file.filename;
    };
    articles.unshift(article);

    //게시물 목록을 다시 저장한다.
    fs.writeFileSync("articles.json", Buffer.from(JSON.stringify(articles)));
    //목록 화면으로 돌아간다.
    // res.send("<!DOCTYPE html><html><head><script>location.href='/list';</head></html>");
    res.redirect("/list");
});

//목록 화면
server.get("/list", function (req, res, next){
    //기존에 작성되어 있던 게시물들을 다 불러온다.
    var articles = JSON.parse(fs.readFileSync("articles.json").toString());
    //페이지네이션 처리 

    var html = `<!doctype html><html><head><meta charset='utf-8'><title>게시물 목록 화면</title><link rel="stylesheet" href="style.css"></head><body>
    <table style = 'width: 60%'>
    <colgroup>
        <col width='5%'>
        <col width='50%'>
        <col width='20%'>
        <col width='10%'>
        <col width='5%'>
    </colgroup>
    <tr>
        <th>번호</th>
        <th>제목</th>
        <th>작성자</th>
        <th>작성일시</th>
        <th>조회수</th>
    </tr>`;
    for(var i=0; i<articles.length; i++){
        html += `<tr>
            <td style='text-align:center;'>${articles.length-i}</td>`;
        if(articles[i].attach)
            html += `<td>${articles[i].subject}[첨]</td>`;
        else
            html += `<td>${articles[i].subject}</td>`;
            
        html += `
            <td style='text-align:center;'>${articles[i].writer}</td>
            <td style='text-align:center;'>${articles[i].regdt}</td>
            <td style='text-align:center;'>${articles[i].hitcount}</td>
        </tr>`;
    }
    html += `<br><a href='write.html'>글 쓰기</a></body></html>`;
    res.send(html);
});

server.listen(3400);