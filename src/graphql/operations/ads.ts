import { gql } from '@apollo/client';

export const GET_ADS = gql`
  query getAds($slug: String, $city: String) {
    getAds(slug: $slug, city: $city) {
      ads {
        id
        orders {
          days
          total
          link
          favicon
          info
          image
          imageRelation { id cdnUrl }
          city
          service {
            name
          }
          category {
            name
          }
          user {
            id
            displayName
            email
            phone
            provider {
              name
            }
          }
        }
      }
      marketingHero {
        id
        key
        image { id cdnUrl }
      }
      marketingHorizontal {
        id
        key
        image { id cdnUrl }
      }
      marketingVertical {
        id
        key
        image { id cdnUrl }
      }
    }
  }
`;

export const GET_DATA_AND_TRANSITIONS = gql`
  query GetDataAndTransitions {
    getAllImageTransition {
      id
      duration
      orientation
      type
    }
  }
`;
