const express = require('express');
const bodyParser = require('body-parser');
const exphbs = require('express-handlebars');
const cheerio = require('cheerio');
const axios = require('axios');
const mongoose = require('mongoose');
const Article = require('./models/articleModel.js');

const PORT = process.env.PORT || 3000;

const app = express();

app.use(express.static('public'));
app.use(bodyParser.json())

mongoose.connect("mongodb://localhost/scrappyscrapper");


app.get('/api/articles', (req, res, next) => {
    axios.get("http://www.nytimes.com")
        .then(data => {
            const $ = cheerio.load(data.data)

            const articles = $("div.collection article");
            articles.each( (i, article) => {
                var result = {};

                result.headline = $("h2 a", article).text();
                result.uri = $("h2 a", article).attr("href");

                if(result.headline && result.uri){
                    options = {
                        upsert: true
                    }
                    conditions = {
                        "headline":result.headline
                    };
                    Article.findOneAndUpdate(conditions, result, options, (err, doc) => {
                        if (err){
                            console.log(err);
                            res.status(500);
                            res.json({"error":"internal server error"})
                        }
                    })
                }

            })

            withComQuery = Article.find({"comments": {$ne: null}}).sort({"created": -1});
            withComQuery.exec( (err, withComArts) => {
                withoutQuery = Article.find({"comments": null}).sort({"created": -1});
                withoutQuery.exec( (err, withoutComArts) => {
                    return res.json({"with": withComArts, "without": withoutComArts});
                })
            })

        })
        .catch( err => {
            return res.send(err);
        })
})

app.post('/api/comment/add', (req, res, next) => {
    const {articleId, comment} = req.body;

    Article.update(
        {_id: articleId},
        {$push: {comments: {comment}}},
        (err, data) => {
            if(err){
                throw err;
            }
            res.statusCode = 200;
            return res.json({"status":"ok"});
        }
    )
})

app.delete('/api/article/:articleId/comment/delete/:commentId', (req, res, next) => {
    const articleId = req.params.articleId;
    const commentId = req.params.commentId;

    Article.findOne({'_id': articleId}, (err, result) => {
        result.comments.id(commentId).remove();
        result.save();
        res.statusCode = 200;
        return res.json({"status":"ok"});
    });

})

app.delete('/api/article/delete/:articleId', (req, res, next) => {
    const articleId = req.params.articleId;
    Article.remove({'_id': articleId}, (err, result) => {
        if(err){
            res.statusCode = 500;
            res.json({"status":"internal server error"});
        }
        res.json({"status":"ok"});
    })
})

app.listen(PORT, () => {
    return console.log(`Server listening on: http://localhost: ${PORT}`);
});