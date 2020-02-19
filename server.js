const http = require('http');
const path = require('path');
const Koa = require('koa');
const koaBody = require('koa-body');
const koaStatic = require('koa-static');
const fs = require('fs');
const uuid = require('uuid');
const app = new Koa();

const port = process.env.PORT || 7070;
const server = http.createServer(app.callback()).listen(port)

// => Static file handling
const public = path.join(__dirname, '/public')
app.use(koaStatic(public));

// => CORS
app.use(async (ctx, next) => {
  const origin = ctx.request.get('Origin');
  if (!origin) {
    return await next();
  }
  const headers = { 'Access-Control-Allow-Origin': '*', };

  if (ctx.request.method !== 'OPTIONS') {
    ctx.response.set({...headers});
    try {
      return await next();
    } catch (e) {
      e.headers = {...e.headers, ...headers};
      throw e;
    }
  }

  if (ctx.request.get('Access-Control-Request-Method')) {
    ctx.response.set({
      ...headers,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH',
    });

    if (ctx.request.get('Access-Control-Request-Headers')) {
      ctx.response.set('Access-Control-Allow-Headers', ctx.request.get('Access-Control-Request-Headers'));
    }
    ctx.response.status = 204;
  }
});
  
// => Body Parsers
app.use(koaBody({
  text: true,
  urlencoded: true,
  multipart: true,
  json: true,
}));

// kod
let listImgs = [];

app.use(async (ctx) => {
 
  if (ctx.method === 'GET') {
    ctx.response.body = listImgs;
  }

 
  if (ctx.method === 'POST') {
    const { name } = ctx.request;
    const { file } = ctx.request.files;
    console.log(file);
    const link = await new Promise((resolve, reject) => {
      const oldPath = file.path;
      // const filename = uuid.v4();
      const filename = file.name;
      const newPath = path.join(public, filename);

      const callback = (error) => reject(error);

      const readStream = fs.createReadStream(oldPath);
      const writeStream = fs.createWriteStream(newPath);

      readStream.on('error', callback);
      writeStream.on('error', callback);

      readStream.on('close', () => {
        console.log('close');
        fs.unlink(oldPath, callback);
        console.log(filename);
        resolve(filename);
      });
      console.log(filename);
      readStream.pipe(writeStream);
    });
    console.log(link);
    listImgs.push(`http://localhost:7070/${link}`)
    ctx.response.body = link;
    return;
  };

 
  if (ctx.method === 'DELETE') {
    const { file } = ctx.request.query;
    const fileName = path.parse(file).base;
    listImgs = listImgs.filter((item) => item !== file);

    fs.unlink(`${public}/${fileName}`, (err) => {
      if (err) throw err;
      console.log(`${public}/${fileName} was deleted`);
    });
    ctx.response.body = 'ok';
    return;
  }
});