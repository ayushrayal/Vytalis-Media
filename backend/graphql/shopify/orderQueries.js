export const GET_RECENT_ORDERS_QUERY = `
  query getRecentOrders($first: Int = 10) {
    orders(first: $first, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          name
          createdAt
          displayFinancialStatus
          displayFulfillmentStatus
          currentTotalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          customer {
            id
            displayName
            firstName
            lastName
          }
        }
      }
    }
  }
`;
