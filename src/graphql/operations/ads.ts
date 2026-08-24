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
          imageRelation { id cdnUrl compressedKey key extension }
          city
          service {
            id
            name
          }
          category {
            id
            name
          }
          user {
            id
            displayName
            email
            phone
          }
        }
      }
      marketingHero {
        id
        image { id cdnUrl compressedKey key extension }
      }
      marketingHorizontal {
        id
        image { id cdnUrl compressedKey key extension }
      }
      marketingVertical {
        id
        image { id cdnUrl compressedKey key extension }
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
