export const GET_TOP_PRODUCTS_QUERY = `
  query getTopProducts($queryFilter: String!, $first: Int = 250) {
    orders(first: $first, query: $queryFilter) {
      edges {
        node {
          id
          lineItems(first: 50) {
            edges {
              node {
                title
                quantity
                originalTotalSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                variant {
                  image {
                    url
                  }
                  product {
                    id
                    title
                    featuredImage {
                      url
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;
