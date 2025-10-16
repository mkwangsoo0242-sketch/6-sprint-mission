테스트를 위한 main.js입니다

const baseUrl = 'https://panda-market-api-crud.vercel.app';

export function getArticleList({ page = 1, pagesize = 10, keyword = '' } = {}) {
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
    .catch((err) => {
      console.error('getArticleList 중 오류 발생:', err);
      throw err;
    });
}
