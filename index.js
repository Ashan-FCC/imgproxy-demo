import { ImgProxy } from '@property-scout/imgproxy'
import fetch from 'node-fetch'
import * as dotenv from 'dotenv'
import { S3Client } from "./s3Client.js";
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
dotenv.config()
import express from 'express'
import 'log-timestamp'

const s3 = S3Client(
  process.env.S3_BUCKET_URL,
  process.env.REGION,
  process.env.DO_ACCESS_KEY,
  process.env.DO_SECRET_ACCESS_KEY
)

const BASE_IMAGE_CDN = 'https://cdn.staticflexstay.com/'
const app = express()
const port = process.env.PORT || 3000

app.get('/images/*', async (req, res) => {

    const getProcessedImage = ({ width, extension, url } ) => {
        const imageProxyConfig = {
            baseUrl: process.env.IMGPROXY_BASE_URL,
            key: process.env.IMGPROXY_KEY,
            imageBasedUrl: process.env.IMGPROXY_BASE_IMAGE_URL,
            salt: process.env.IMGPROXY_SALT,
            extension,
            quality: 70,
            resize: 'fit',
            watermark: '1:soea:20:20:0.3',
        }
        const imgProxy = new ImgProxy(imageProxyConfig)
        return imgProxy.getSignedUrl(width, url)
    }
    const width = req.query.width
    const extension = req.query.extension
    console.log('path', req.path)
    console.log('width', width)
    console.log('extension', extension)
    // const key = generateS3Key(req.path, width, extension)
    const path = new URL(req.path, BASE_IMAGE_CDN).href
    console.log('Source image', path)
    const image = getProcessedImage({ width, extension, path:req.path })
    console.log('Image url', image)
    const img = await fetch(path)
    // const blob = await img.buffer()
    //const blob = await uploadToS3(image)
    return res.header('Content-Type', `image/${extension}`).send(await img.buffer())
})

app.get('/images2/*', async (req, res) => {

    const getProcessedImage = ({ width, extension, url } ) => {
        const imageProxyConfig = {
            baseUrl: process.env.IMGPROXY_BASE_URL,
            key: process.env.IMGPROXY_KEY,
            imageBasedUrl: process.env.IMGPROXY_BASE_IMAGE_URL,
            salt: process.env.IMGPROXY_SALT,
            extension,
            quality: 70,
            resize: 'fit',
            watermark: '1:soea:20:20:0.3',
        }
        const imgProxy = new ImgProxy(imageProxyConfig)
        return imgProxy.getSignedUrl(width, url)
    }
    const width = req.query.width
    const extension = req.query.extension
    const imagePath = req.path
    console.log('path', imagePath)
    console.log('width', width)
    console.log('extension', extension)

    const key = imagePath.replace('/images2/', '')
    console.log(key)

    try {
        const img = await getImageFromS3(key)

        if(img.Body.statusCode === 200){
            res.header('Content-Type', `image/${extension}`)
            img.Body.pipe(res)
        }

    }catch (e){
        console.error(e)
        res.send('No ok')
    }

})

app.all('*', async (req, res) => {

    console.log(req.path)

    res.send('Default route')
})
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

async function uploadToS3(key, extension, blob){
    const object_upload_params = {
        Bucket: process.env.S3_PUBLIC_BUCKET,
        Key: key,
        Body: blob,
        ACL:'public-read',
        ContentType: `image/${extension}`
    };
    await s3.send(new PutObjectCommand(object_upload_params));
    return blob
}

async function getImageFromS3(key){
    const object_upload_params = {
        Bucket: process.env.S3_PRIVATE_BUCKET,
        Key: key,
    };
    const res = await s3.send(new GetObjectCommand(object_upload_params));
    return res
}
