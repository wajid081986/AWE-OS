'use strict';

/**
 * Shared Twitter/X posting helper.
 * Extracted so both the admin-triggered social-publish route and
 * autonomous cron jobs can post through the same client/error handling.
 */

const { TwitterApi } = require('twitter-api-v2');

function getTwitterClient() {
  const { X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET } = process.env;
  if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_TOKEN_SECRET) {
    throw new Error('Twitter API credentials not configured in environment');
  }
  return new TwitterApi({
    appKey:       X_API_KEY,
    appSecret:    X_API_SECRET,
    accessToken:  X_ACCESS_TOKEN,
    accessSecret: X_ACCESS_TOKEN_SECRET,
  });
}

function buildTweetText(text, url) {
  if (url && !text.includes(url)) {
    const suffix = ` ${url}`;
    text = (text.length + suffix.length) <= 280
      ? text + suffix
      : text.slice(0, 280 - suffix.length - 3) + '...' + suffix;
  }
  if (text.length > 280) text = text.slice(0, 277) + '...';
  return text;
}

function classifyTwitterError(err) {
  const msg    = (err.message || '').toLowerCase();
  const status = err.data?.status || err.code;
  if (status === 429 || msg.includes('rate limit'))   return 'Twitter rate limit reached. Try again in 15 minutes.';
  if (status === 401 || msg.includes('unauthorized'))  return 'Twitter auth error. Check API credentials.';
  if (msg.includes('duplicate'))                       return 'Duplicate tweet. Twitter does not allow identical tweets.';
  return err.message || 'Twitter post failed';
}

/**
 * Post a tweet. Throws with a classified, human-readable message on failure —
 * callers are expected to catch and log rather than let it crash a cron run.
 */
async function postTweet(text, url) {
  const client   = getTwitterClient();
  const tweetText = buildTweetText(text, url);
  try {
    const tweet   = await client.v2.tweet(tweetText);
    const tweetId = tweet.data.id;
    return { tweetId, tweetUrl: `https://twitter.com/i/web/status/${tweetId}` };
  } catch (err) {
    throw new Error(classifyTwitterError(err));
  }
}

module.exports = { postTweet, buildTweetText, classifyTwitterError, getTwitterClient };
