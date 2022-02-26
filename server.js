var express = require("express");
var server = express();
var fs = require("fs");
var multer = require("multer");
var uploadMw = multer({ dest: "./upload" });

// 미들웨어 정의
server.use(express.static("./statics"));

//urlencoded 미들웨어 정의
//경고문구를 없애고 싶다면 express.urlencoded({extends:true})
server.use(express.urlencoded());

//날짜 형식
function dateFormat(date) {
    let month = date.getMonth() + 1;
    let day = date.getDate();
    let hour = date.getHours();
    let minute = date.getMinutes();
    let second = date.getSeconds();

    month = month >= 10 ? month : '0' + month;
    day = day >= 10 ? day : '0' + day;
    hour = hour >= 10 ? hour : '0' + hour;
    minute = minute >= 10 ? minute : '0' + minute;
    second = second >= 10 ? second : '0' + second;

    return date.getFullYear() + '-' + month + '-' + day + ' ' + hour + ':' + minute;
}

//글 쓰기 처리
//uploadMw() - 업로드된 첨부파일을 저장하는 미들웨어
server.post("/write", uploadMw.single("attach"), function (req, res, next) {
    //기존에 작성되어 있던 게시물들을 불러온다.
    var articles = JSON.parse(fs.readFileSync("articles.json").toString());
    //사용자가 작성한 새 게시물을 덧붙인다.
    var article = {
        subject: req.body.subject,
        writer: req.body.writer,
        content: req.body.content.replaceAll(/\r\n/g, '<br>'),
        regdt: dateFormat(new Date()),
        hitcount: 0,
        boardNum: articles.length + 1
    }
    //첨부파일이 존재하면 첨부파일도 저장
    if (req.file) {
        article.attach = req.file.filename;
    };
    articles.push(article);

    //게시물 목록을 다시 저장한다.
    fs.writeFileSync("articles.json", Buffer.from(JSON.stringify(articles)));
    //목록 화면으로 돌아간다.
    // res.send("<!DOCTYPE html><html><head><script>location.href='/list';</head></html>");
    res.redirect("/list");
});

//목록 화면
server.get("/list", function (req, res, next) {
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
        <th style='text-align: center;'>번호</th>
        <th>제목</th>
        <th>작성자</th>
        <th >작성일시</th>
        <th>조회수</th>
    </tr>`;
    for (var i = articles.length - 1; i >= 0; i--) {
        html += `<tr>
            <td style='text-align:center; border-top: 1px solid #e7e7e7;'>${articles[i].boardNum}</td>`;
        if (articles[i].attach)
            html += `<td style='border-top: 1px solid #e7e7e7;'><a href='read?no=${articles[i].boardNum}' style=' list-style: none; text-decoration: none; padding:0px 15px 0px 15px;'>${articles[i].subject}[첨]</a></td>`;
        else
            html += `<td style='border-top: 1px solid #e7e7e7;'><a href='read?no=${articles[i].boardNum}' style=' list-style: none; text-decoration: none; padding:0px 15px 0px 15px;'>${articles[i].subject}</a></td>`;

        html += `
            <td style='text-align:center; border-top: 1px solid #e7e7e7;'>${articles[i].writer}</td>
            <td style='text-align:center; border-top: 1px solid #e7e7e7;'>${articles[i].regdt}</td>
            <td style='text-align:center; border-top: 1px solid #e7e7e7;'>${articles[i].hitcount}</td>
        </tr>`;
    }
    html += `<a href='write.html' style=' list-style: none; text-decoration: none;'>글 쓰기</a></body></html>`;
    res.send(html);
});

//읽기 화면
server.get("/read", function (req, res, next) {
    //게시물 번호
    var no = req.query.no - 1;

    //기존에 작성되어 있던 게시물들을 다 불러온다.
    var articles = JSON.parse(fs.readFileSync("articles.json").toString());

    //조회수 증가해준다.
    articles[no].hitcount += 1;

    //게시물 목록을 다시 저장한다.
    fs.writeFileSync("articles.json", Buffer.from(JSON.stringify(articles)));

    //기존에 작성된 댓글들을 불러온다.
    var comments = JSON.parse(fs.readFileSync("comments.json").toString());
    var cmtArr = [];

    for (i = 0; i < comments.length; i++) {
        if (parseInt(comments[i].no) == no + 1) {
            cmtArr.unshift(comments[i]);
        }
    }

    html = `<!doctype html><html><head><meta charset='utf-8'><title>게시물 읽기 화면</title></head><body>

    <div style='border: 1px solid #ddd; border-radius:3px; width:700px;'>
    <div style='list-style:none; padding: 20px 10px;'>
        <h2 style='margin:0px; padding-bottom:10px; padding: 0px 40px 5px 40px;'>${articles[no].subject}</h2>
            <ul style='list-style:none; margin: 0px; float:left; display:inline-block; border-bottom:2px solid #ddd; width:600px; padding: 0px 40px 10px 40px;'>
                <li style='display:inline-block;'>${articles[no].writer}</li>
                <li style='font-size:0.75em; color:#bbb; display:inline-block; padding: 0px 10px; '>${articles[no].regdt}</li>
                <li style='font-size:0.75em; color:#bbb; display:inline-block; '>조회수 ${articles[no].hitcount}</li>
            </ul><br>
        <div style='font-size: 18px; padding: 40px 40px 20px 40px;'>${articles[no].content}</div>
    </div>

    <div style=' padding: 0px 10px;'>
        <div style='padding:0px 10px 10px 10px; border-top:2px solid #ddd;'>
            <form action='/comment' method='get'>
                <input name='no' value='${no + 1}' style='display:none;'>
                <h4 style='margin:10px 0px 10px 5px;'> comments </h4>
                <input type='text' name='name' placeholder='이름' style='margin-bottom: 10px; height:20px;'><br>
                <textarea name='content' placeholder='댓글 내용을 입력하세요' style='width:400px; height:100px; min-height:40px; resize: none;'></textarea>
                <input type='submit' value='작성' style='width:80px; height:40px; transform:translatey(-40%);'>
            </form>
        </div>`;

    for (var i = 0; i < cmtArr.length; i++) {
        html += `
        <ul style='list-style:none; padding:15px 5px 5px 20px; border-top:2px solid #ddd; width:600px; margin: 0px;'>
            <li style=' padding=5px;'>
                    <ul style='list-style:none; padding: 0px; float:left; display:inline-block'>
                        <li style='display:inline-block;'>${cmtArr[i].name}</li>
                        <li style='font-size:0.75em; color:#bbb; display:inline-block; '>${cmtArr[i].regdt}</li>
                    </ul>
                    <p style='clear:both; padding:15px 0px 0px; color:#777; font:normal 0.875em 'NanumBarunGothic', 'Noto Sans', sans-serif; line-height:1.5em;'>${cmtArr[i].content}</p>
            </li>
        </ul>
        `;
    }

    html += `</div></div><button><a href='list' style='text-decoration:none;'>목록으로 돌아가기</a></button>
    </body></html>`;

    res.send(html);
});


server.get("/comment", function (req, res, next) {
    //기존에 작성된 댓글들을 불러온다.
    var comments = JSON.parse(fs.readFileSync("comments.json").toString());

    var comment = {
        no: req.query.no,
        name: req.query.name,
        content: req.query.content.replaceAll(/\r\n/g, '<br>'), //개행 문자를 줄바꿈으로 치환해준다.
        regdt: dateFormat(new Date())
    }

    comments.unshift(comment);

    //댓글을 다시 저장한다.
    fs.writeFileSync("comments.json", Buffer.from(JSON.stringify(comments)));
    //읽기 화면으로 돌아간다.
    res.redirect(`/read?no=${req.query.no}`);
});


server.listen(3400);