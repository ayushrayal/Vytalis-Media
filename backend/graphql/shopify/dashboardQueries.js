export const GET_DASHBOARD_ANALYTICS_QUERY = `
  query getDashboardAnalytics($queryFilter: String!, $first: Int = 250) {
    orders(first: $first, query: $queryFilter) {
      edges {
        node {
          id
          name
          createdAt
          currentTotalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          customer {
            id
            displayName
            numberOfOrders
          }
          lineItems(first: 50) {
            edges {
              node {
                quantity
              }
            }
          }
        }
      }
    }
  }
`;
