const axios = require('axios')
const parser = require('node-html-parser')

function convertDateString(dateStr) {
  const leftSide = dateStr.split('·')[0].trim()
  const rightSide = dateStr.split('·')[1].trim()
  const date = new Date(leftSide + ' ' + rightSide)
  return date
  
}
function convertDateString2(dateStr) {
  const rightSide = dateStr.split('-')[0].trim()
  const leftSide = dateStr.split('-')[1].trim()
  const date = new Date(leftSide + ' ' + rightSide +' UTC')
  return date
}

async function makeContentArr(content) {
  const contentArr = []
  for (var i = 0; i < content.length; i ++) {
    const item = content[i]
    if (item.rawAttrs.includes('video-container')) {
      try {
        const referer = item.querySelector('input').rawAttrs.split('value="')[1].split('"')[0]
        var config = {
          method: 'post',
          url: 'https://nitter.net/enablehls?referer=' + referer,
          headers: { 
            'Cookie': 'hlsPlayback=on'
          }
        };
        const resp = await axios(config)
        const rootContent = parser.parse(resp.data)
        const videoUrl = rootContent.querySelector('video').rawAttrs
        const videoPoster = videoUrl.split('poster="')[1].split('"')[0]
        const actualVideoUrl = videoUrl.split('data-url="')[1].split('"')[0]
        contentArr.push({
          type: 'video',
          isGif: false,
          poster: 'https://nitter.net' + videoPoster,
          url: 'https://nitter.net' + actualVideoUrl
        })
      } catch (err) {
        contentArr.push({
          type: 'notFound'
        })
      }
   } else {
       if (item.childNodes[0].rawAttrs.includes('class="gif"')) {
       contentArr.push({
         type: 'video',
         isGif: true,
         poster: 'https://nitter.net' + item.childNodes[0].rawAttrs.split('poster="')[1].split('"')[0],
         url: 'https://nitter.net' + item.childNodes[0].childNodes[0].rawAttrs.split('src="')[1].split('"')[0]
       })
     } else if (item.childNodes[0].rawAttrs.includes('class="still-image"')) {
       contentArr.push({
         type: 'image',
         url: 'https://nitter.net' + item.childNodes[0].rawAttrs.split('href="')[1].split('"')[0]
       })
     }
   }
  } 
  return contentArr
}
async function getUser (url) {
  try {
    url = url.replace('twitter.com', 'nitter.net')
    const response = await axios.get(url, {headers: { "Accept-Encoding": "gzip,deflate,compress" } })
    const doc = parser.parse(response.data)

    const date = convertDateString2(doc.querySelector('.profile-joindate').childNodes[0].rawAttrs.split('title="')[1].split('"')[0])
    const avatar = 'https://nitter.net' + doc.querySelector('.profile-card-avatar').childNodes[0].rawAttrs.split('src="')[1].split('"')[0]

    const authorInfo = {
      name: 'N/A',
      handle: 'N/A',
      bio: 'N/A',
      location: 'N/A',
      date: date,
      avatar: avatar
    }

    const statistics = doc.querySelector(".profile-statlist")
    if (statistics) {
      const tweets = parseInt(statistics.querySelector('.posts').querySelector('.profile-stat-num').rawText.replaceAll(',', '')) || 0
      const following = parseInt(statistics.querySelector('.following').querySelector('.profile-stat-num').rawText.replaceAll(',', '')) || 0
      const followers = parseInt(statistics.querySelector('.followers').querySelector('.profile-stat-num').rawText.replaceAll(',', '')) || 0
      const likes = parseInt(statistics.querySelector('.likes').querySelector('.profile-stat-num').rawText.replaceAll(',', '')) || 0
      const stats = {
        tweets: tweets,
        following: following,
        followers: followers,
        likes: likes
      }
      authorInfo.statistics = stats
    }
    const nameDiv = doc.querySelector('.profile-card-fullname')
    if (nameDiv) {
      const name = nameDiv.rawText
      authorInfo.name = name
    }
    const handleDiv = doc.querySelector('.profile-card-username')
    if (handleDiv) {
      const handle = handleDiv.rawText
      authorInfo.handle = handle
    }
    const bioDiv = doc.querySelector('.profile-bio')
    if (bioDiv) {
      const bio = bioDiv.rawText
      authorInfo.bio = bio
    }
    const locationDiv = doc.querySelector('.profile-location')
    if (locationDiv) {
      const location = locationDiv.rawText
      authorInfo.location = location
    }
    return {success: true, data: authorInfo }
  } catch (err) {
    console.log('error getting author')
    console.log(err)
    return {
      success: false,
      error: err
    }
  }
}
async function getTweet(url, n) {
  try {
    if (n !== undefined) {
      if (n === true) {
        url = url.replace('nitter.net', 'nitter.fly.dev')
      } else {
        url = url.replace('nitter.fly.dev', 'nitter.it')
      }
    } else {
      url = url.replace('twitter.com', 'nitter.net')
    }
    console.log('url is ')
    console.log(url)
    const response = await axios.get(url, {headers: { "Accept-Encoding": "gzip,deflate,compress" } })
    const root = parser.parse(response.data)
    const tweet = root.querySelector('#m')
    let authorUrl = ''
    if (n === undefined) {
      authorUrl = 'https://nitter.net'
    } else if (n === true) {
      authorUrl = 'https://nitter.fly.dev'
    } else {
      authorUrl = 'https://nitter.it'
    }
    authorUrl = authorUrl + tweet.querySelector('.username').rawAttrs.split('href="')[1].split('"')[0]
    const authorRes = await getUser(authorUrl)
    const author = authorRes.data
    if (author === undefined) {
      return {success: false, error: 'Author not found'}
    }
    const description = tweet.querySelector('.tweet-content').textContent
    const contentContent = tweet.querySelectorAll('.attachments')
    let contentArr = []
    if (contentContent && contentContent.length > 0) {
      for (var i = 0; i < contentContent.length; i++) {
        if (!contentContent[i].parentNode.rawAttrs.includes('quote')) {
          const content = contentContent[i].querySelectorAll('.attachment')
          contentArr = await makeContentArr(content)
        }
      }
    }
    const original = root.querySelector('link[rel="canonical"]').rawAttrs.split('href="')[1].split('"')[0]
    const id = original.split('/').pop()
    const dateString = tweet.querySelector('.tweet-published').rawText
    const date = convertDateString(dateString)

    const tweetInfo = {
      author: author,
      text: description,
      content: contentArr,
      date: date,
      original: original,
      id: id
    }

    const statsDiv = tweet.querySelector('.tweet-stats')
    if (statsDiv) {
      const comments = parseInt(statsDiv.querySelector('.icon-comment').parentNode.rawText.replaceAll(',', ''))
      const retweets = parseInt(statsDiv.querySelector('.icon-retweet').parentNode.rawText.replaceAll(',', ''))
      const quotes = parseInt(statsDiv.querySelector('.icon-quote').parentNode.rawText.replaceAll(',', ''))
      const likes = parseInt(statsDiv.querySelector('.icon-heart').parentNode.rawText.replaceAll(',', ''))
      tweetInfo.statistics = {
        comments: comments || 0,
        retweets: retweets || 0,
        quotes: quotes || 0,
        likes: likes || 0
      }
    }
    const pollData = tweet.querySelector('.poll')
    if (pollData) {
      const options = pollData.querySelectorAll('.poll-meter')
      const pollOptions = []
      for (var i = 0; i < options.length; i ++) {
        const option = options[i]
        const optionText = option.querySelector('.poll-choice-option').textContent
        const optionPercent = option.querySelector('.poll-choice-value').textContent
        pollOptions.push({
          option: optionText,
          percent: optionPercent
        })
      }
      const pollInfo = pollData.querySelector('.poll-info').textContent
      const poll = {
        info: pollInfo,
        options: pollOptions
      }
    }

    const quoteDiv = tweet.querySelector('.quote')
    if (quoteDiv) {
      const quoteUrl = quoteDiv.querySelector('.quote-link').rawAttrs.split('href="')[1].split('"')[0]
      if (n === undefined) {
        const quote = await getTweet('https://nitter.net' + quoteUrl)
        tweetInfo.quote = quote.data
      } else if (n === true) {
        const quote = await getTweet('https://nitter.fly.dev' + quoteUrl)
        tweetInfo.quote = quote.data
      } else {
        const quote = await getTweet('https://nitter.it' + quoteUrl)
        tweetInfo.quote = quote.data
      }
    }
    console.log(tweetInfo)
    return {
      success: true,
      data: tweetInfo,
    }
  } catch (err) {
    if (n !== undefined) {
      if (n === true) {
        return getTweet(url, false)
      }
      return {
        success: false,
        error: err
      }
    }

    return getTweet(url, true)
  }
}

exports.getTweetByURL = async function (url) {
  try {
    const results = await getTweet(url)
    if (results.error !== undefined) {
      throw Error(results.error)
    }
    return results.data
  } catch (err) {
    return Error(err)
  }
}
exports.getUserByURL = async function (url) {
  try {
    const results = await getUser(url)
    if (results.error !== undefined) {
      throw Error(results.error)
    }
    return results.data
  } catch (err) {
    return Error(err)
  }
}