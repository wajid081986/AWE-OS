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

// Stable machine-readable codes — callers (e.g. the social post retry queue)
// branch on these rather than parsing the human-readable message.
const TWITTER_ERROR_CODES = Object.freeze({
  CREDITS_DEPLETED: 'CREDITS_DEPLETED',
  RATE_LIMIT:       'RATE_LIMIT',
  AUTH:             'AUTH',
  UNKNOWN:          'UNKNOWN',
});

function classifyTwitterErrorCode(err) {
  const msg    = (err.message || '').toLowerCase();
  const status = err.data?.status || err.code;
  if (status === 402 || err.data?.title === 'CreditsDepleted') return TWITTER_ERROR_CODES.CREDITS_DEPLETED;
  if (status === 429 || msg.includes('rate limit'))            return TWITTER_ERROR_CODES.RATE_LIMIT;
  if (status === 401 || msg.includes('unauthorized'))          return TWITTER_ERROR_CODES.AUTH;
  return TWITTER_ERROR_CODES.UNKNOWN;
}

function classifyTwitterError(err) {
  const code = classifyTwitterErrorCode(err);
  if (code === TWITTER_ERROR_CODES.CREDITS_DEPLETED) return 'X API credits depleted — top up credits in the X Developer Portal.';
  if (code === TWITTER_ERROR_CODES.RATE_LIMIT)       return 'Twitter rate limit reached. Try again in 15 minutes.';
  if (code === TWITTER_ERROR_CODES.AUTH)             return 'Twitter auth error. Check API credentials.';
  if ((err.message || '').toLowerCase().includes('duplicate')) return 'Duplicate tweet. Twitter does not allow identical tweets.';
  return err.message || 'Twitter post failed';
}

/**
 * Post a tweet. Throws a classified error on failure — the thrown Error has
 * a `.code` (one of TWITTER_ERROR_CODES) so callers can decide whether/when
 * to retry rather than just parsing the message string.
 */
async function postTweet(text, url) {
  const client   = getTwitterClient();
  const tweetText = buildTweetText(text, url);
  try {
    const tweet   = await client.v2.tweet(tweetText);
    const tweetId = tweet.data.id;
    return { tweetId, tweetUrl: `https://twitter.com/i/web/status/${tweetId}` };
  } catch (err) {
    const classified = new Error(classifyTwitterError(err));
    classified.code = classifyTwitterErrorCode(err);
    throw classified;
  }
}

module.exports = {
  postTweet,
  buildTweetText,
  classifyTwitterError,
  classifyTwitterErrorCode,
  getTwitterClient,
  TWITTER_ERROR_CODES,
};
