const baseUrl = 'https://panda-market-api-crud.vercel.app';

export function getArticleList({ page = 1, pageSize = 10, keyword = '' } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    keyword,
  });
  const url = `${baseUrl}/articles?${params.toString()}`;

  return fetch(url, { method: 'GET' })
    .then((response) => {
      if (!response.ok) {
        console.error(
          'getArticleList 실패 - 상태 코드:',
          response.status,
          'URL:',
          url
        );
        throw new Error('서버 응답 에러');
      }
      return response.json();
    })
    .then((data) => data)
    .catch((error) => {
      console.error('getArticleList 중 오류 발생:', error);
      throw error;
    });
}

export function getArticle(articleId) {
  const url = `${baseUrl}/articles/${articleId}`;

  return fetch(url, { method: 'GET' })
    .then((response) => {
      if (!response.ok) {
        console.error(
          'getArticle 실패 - 상태 코드:',
          response.status,
          'URL:',
          url
        );
        throw new Error('서버 응답 에러');
      }
      return response.json();
    })
    .then((data) => data)
    .catch((error) => {
      console.error('getArticle 중 오류 발생:', error);
      throw error;
    });
}

export function createArticle({ title, content, image }) {
  const url = `${baseUrl}/articles`;
  const body = { title, content, image };

  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
    .then((response) => {
      if (!response.ok) {
        console.error(
          'createArticle 실패 - 상태 코드:',
          response.status,
          'URL:',
          url
        );
        throw new Error('서버 응답 에러');
      }
      return response.json();
    })
    .then((data) => data)
    .catch((error) => {
      console.error('createArticle 중 오류 발생:', error);
      throw error;
    });
}

export function patchArticle(articleId, updateFields) {
  const url = `${baseUrl}/articles/${articleId}`;

  return fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateFields),
  })
    .then((response) => {
      if (!response.ok) {
        console.error(
          'patchArticle 실패 - 상태 코드:',
          response.status,
          'URL:',
          url
        );
        throw new Error('서버 응답 에러');
      }
      return response.json();
    })
    .then((data) => data)
    .catch((error) => {
      console.error('patchArticle 중 오류 발생:', error);
      throw error;
    });
}

export function deleteArticle(articleId) {
  const url = `${baseUrl}/articles/${articleId}`;

  return fetch(url, { method: 'DELETE' })
    .then((response) => {
      if (!response.ok) {
        console.error(
          'deleteArticle 실패 - 상태 코드:',
          response.status,
          'URL:',
          url
        );
        throw new Error('서버 응답 에러');
      }
      if (response.status === 204) return null;
      return response.json();
    })
    .then((data) => data)
    .catch((error) => {
      console.error('deleteArticle 중 오류 발생:', error);
      throw error;
    });
}

/*
테스트 사용 예시(다른 파일이나 REPL에서 실행하세요):

import { getArticleList, getArticle, createArticle, patchArticle, deleteArticle } from './ArticleService.js';

getArticleList({ page: 1, pageSize: 5, keyword: '노트북' })
  .then(data => console.log('목록:', data))
  .catch(() => console.log('목록 불러오기 실패'));
*/
