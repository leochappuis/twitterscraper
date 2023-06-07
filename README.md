**easyTwitterScraper**

Provides an easy way to retrieve info about a tweet.
https://www.npmjs.com/package/easytwitterscraper

All it takes is the tweet url.
It will scrape instances of nitter and return all info it can.

```js
const twitterScraper = require('easytwitterscraper')

async function getInfoAboutTweet (url) {
  const info = await twitterScraper.getTweetByURL(url)
  console.log(info)
}
async function getInfoAboutTwitterUser (url) {
  const info = await twitterScraper.getUserByURL(url)
  console.log(info)
}
getInfoAboutTweet('https://twitter.com/leo_chappuis/status/1623469535775887363')
getInfoAboutTwitterUser ('https://twitter.com/leo_chappuis')
```