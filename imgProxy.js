import createHmac from 'create-hmac'

export class ImgProxy {

  constructor(options) {
    this.key = options.key
    this.salt = options.salt
    this.baseUrl = options.baseUrl
    this.imageBasedUrl = options.imageBasedUrl
    this.resize = `rs:${options.resize || 'fit'}`
    this.quality = `q:${options.quality || 70}`
    this.extension = options.extension || 'webp'
    this.watermark = `wm:${options.watermark || '1:soea:20:20:0.3'}`
  }

  safeBase64Url(string) {
    return Buffer.from(string).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  }

  sign(salt, target, secret) {
    const hmac = createHmac('sha256', Buffer.from(secret, 'hex'))
    hmac.update(Buffer.from(salt, 'hex'))
    hmac.update(target)

    return this.safeBase64Url(hmac.digest())
  }

  getSignedUrl(width, src) {
    const url = new URL(src, this.imageBasedUrl).href
    console.log('image url for ImageProxy:', url)
    const safeUrl = this.safeBase64Url(src)
    const imagePath = `/${this.watermark}/${this.resize}:${width}/${this.quality}/${safeUrl}.${this.extension}`
    const signature = this.sign(this.salt, imagePath, this.key)
    const imgUrl = new URL(`${signature}${imagePath}`, this.baseUrl)

    return imgUrl.href
  }
}