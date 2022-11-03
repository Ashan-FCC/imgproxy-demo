import { ImgProxy } from './imgProxy.js'
import fetch from 'node-fetch'
import * as dotenv from 'dotenv'
import { S3Client } from "./s3Client.js";
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl }  from '@aws-sdk/s3-request-presigner'
dotenv.config()
import express from 'express'
import 'log-timestamp'

const s3 = S3Client(
  process.env.S3_ENDPOINT,
  process.env.REGION,
  process.env.DO_ACCESS_KEY,
  process.env.DO_SECRET_ACCESS_KEY
)

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

    const createImageKey = (imgPath, extension, width) => {
        const imageName = imgPath.split('.')[0]
        return `${imageName}_w${width}.${extension}`
    }
    const width = req.query.width
    const extension = req.query.extension
    const imagePath = req.path.replace('/images/', '')

    try {
        const img = await getImageFromS3(imagePath)

        if(img.Body.statusCode === 200){

            const signedUrl = await getSignedUrlFromPrivateS3(imagePath)
            const imageUrl = getProcessedImage({ width, extension, url: signedUrl })
            const img = await fetch(imageUrl)

            if(img.status === 200){
                const blob = await img.buffer()
                const uploadKey = createImageKey(imagePath, extension, width)
                await uploadToS3(uploadKey, extension, blob)

                res.header('Content-Type', `image/${extension}`)
                res.send(blob)
            } else {
                res.send('Couldn\'t fetch imgproxy image')
            }
        }

    }catch (e){
        console.error(e)
        res.send('No ok')
    }
})

app.all('*', async (req, res) => {
    res.send('Default route')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

async function uploadToS3(key, extension, blob){
    const putObjectParams = {
        Bucket: process.env.S3_PUBLIC_BUCKET,
        Key: key,
        Body: blob,
        ACL:'public-read',
        ContentType: `image/${extension}`
    };
    await s3.send(new PutObjectCommand(putObjectParams));
    return blob
}

async function getSignedUrlFromPrivateS3(key){
    const getObjectParams = {
        Bucket: process.env.S3_PRIVATE_BUCKET,
        Key: key,
    };
    const signedUrl =  await getSignedUrl(s3, new GetObjectCommand(getObjectParams), { expiresIn: 3600 });
    console.log('Signed url', signedUrl)
    return signedUrl
}

async function getImageFromS3(key){
    const getObjectParams = {
        Bucket: process.env.S3_PRIVATE_BUCKET,
        Key: key,
    };
    return await s3.send(new GetObjectCommand(getObjectParams));
}
