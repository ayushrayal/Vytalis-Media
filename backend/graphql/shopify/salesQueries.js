export const GET_SALES_TREND_QUERY = `
  query getSalesTrend($queryFilter: String!, $first: Int = 250) {
    orders(first: $first, query: $queryFilter) {
      edges {
        node {
          id
          createdAt
          currentTotalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`;
