var express = require("express");
var server = express();
var fs = require("fs");
var multer = require("multer");
var uploadMw = multer({ dest: "./upload" });
var cp = require("cookie-parser");

//EJS 템플릿 엔진을 설정
server.set("view engine", "ejs");
server.set("views", "./templates");

// 미들웨어 정의
server.use(express.static("./statics"));

//urlencoded 미들웨어 정의
//경고문구를 없애고 싶다면 express.urlencoded({extends:true})
server.use(express.urlencoded());

//쿠키 미들웨어
server.use(cp());

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

//로그인 처리
server.post("/login", function(req, res, next){
    //저장된 회원목록을 불러옴
    var members = JSON.parse(fs.readFileSync("members.json").toString());
    var nickname;
    //회원목록을 순회하면서 지금 로그인을 시도하는 이 회원의 아이디가 존재하는지 확인한다.
    var foundMember = members.filter(function(el){
        if(el.id == req.body.id && el.password == req.body.password) {
            nickname = el.nickname;
            return true;
        }else return false;
    });

    //필터링된 회원정보의 길이를 통해서 로그인 성공여부를 판별
    if(foundMember.length != 1) {
        //로그인 실패 처리
        res.redirect("/loginFail.html");
    }else{
        //로그인 성공 처리
        //쿠키 설정
        res.cookie("login_id", req.body.id);
        res.cookie("login_nickname", nickname);
        res.redirect("/list");
    }
});

//로그아웃 처리
server.get("/logout", function(req, res, next){
    res.clearCookie('login_id');
    res.clearCookie('login_nickname');
    res.redirect('/login.html');
});

//회원가입 처리
server.post("/signup", function(req, res, next){
    //저장된 회원목록을 불러옴
    var members = JSON.parse(fs.readFileSync("members.json").toString());
    //회원목록을 순회하면서 지금 회원가입을 시도하는 이 회원의 아이디가 존재하는지 확인한다.
    var foundMember = members.filter(function(el){
        if(el.id != req.body.id) return false;
        else return true;
    });

    //필터링된 회원정보의 길이를 통해서 로그인 성공여부를 판별
    if(foundMember.length != 0) {
        //회원가입 실패 처리
        res.redirect("/signupFail.html");
    }else{
        //회원가입 성공 처리
        var member = {
            id: req.body.id,
            password: req.body.password,
            nickname: req.body.nickname,
        }

        members.unshift(member);
        fs.writeFileSync("members.json", Buffer.from(JSON.stringify(members)));

        //쿠키 설정
        res.cookie("login_id", req.body.id);
        res.cookie("login_nickname", req.body.nickname);

        //리스트 화면으로 돌아간다.
        res.redirect("/list");
    }
});

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
    var page = 1; //현재 페이지
    if (req.query.page) page = parseInt(req.query.page);

    var pageCnt = 5; //페이지 보일 수
    var postCnt = 10; // 게시글 보일 수

    var end = page % pageCnt == 0 ? page : page - page % pageCnt + pageCnt; //현재 페이지의 마지막 번호
    var start = page % pageCnt == 0 ? end - (pageCnt - 1) : page - page % pageCnt + 1; //현재 페이지의 첫 번호
    var total = Math.ceil(articles.length / postCnt); //총 페이지
    var next = end + 1; //다음 페이지
    var prev = start - pageCnt; //이전 페이지
    var last = page * postCnt; //게시글 마지막
    var first = last - postCnt; //게시글 첫번쨰

    if (last > articles.length) last = articles.length;
    if (end > total) end = total;

    //list.ejs로 데이터를 보내줌
    res.render("list", {
        "login_id": req.cookies.login_id,
        "login_nickname": req.cookies.login_nickname,
        "articles": articles,
        "first": first,
        "last": last,
        "start": start,
        "end": end,
        "page": page,
        "next": next,
        "prev": prev,
        "total": total,

    });
});

//읽기 화면
server.get("/read", function (req, res, next) {
    //게시물 번호
    var no = req.query.no - 1;

    //이전 페이지 번호
    var page = req.query.page;

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
            cmtArr.push(comments[i]);
        }
    }

        //read.ejs로 데이터를 보내줌
        res.render("read", {
            "articles": articles,
            "no": no,
            "cmtArr": cmtArr,
            "page": page,
        });
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