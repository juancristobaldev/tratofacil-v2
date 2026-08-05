import { gql } from '@apollo/client';

export const GET_MAIN_CATEGORIES = gql`
  query GetMainCategories {
    mainCategories {
      id
      name
      slug
    }
  }
`;

export const GET_CATEGORIES = gql`
  query GetCategories {
    categories {
      id
      name
      slug
      description
      position
      imageUrl
      image {
        id
        cdnUrl
      }
      subCategories {
        id
        name
        slug
      }
    }
  }
`;

export const GET_CATEGORY_BY_SLUG = gql`
  query GetCategoryBySlug($slug: String!) {
    categoryBySlug(slug: $slug) {
      id
      name
      slug
      description
      subCategories {
        id
        name
        slug
      }
    }
  }
`;

export const GET_SERVICES_BY_CATEGORY = gql`
  query GetServicesByCategory(
    $slug: String!
    $city: String
    $includeProvidersOnly: Boolean
    $skip: Int
    $take: Int
  ) {
    servicesByCategory(
      categorySlug: $slug
      city: $city
      includeProvidersOnly: $includeProvidersOnly
      skip: $skip
      take: $take
    ) {
      id
      name
      slug
      category {
        id
        name
        slug
      }
      serviceProviders {
        id
        price
        hasHomeVisit
        description
        cities {
          city
        }
        provider {
          id
          name
          location
          lat
          lng
          slug
          logoImage {
            id
            cdnUrl
          }
          isRealtimeActive
          reviews {
            id
            rating
            comment
            createdAt
          }
        }
      }
    }
  }
`;
