import { gql } from '@apollo/client';

export const GET_PUBLIC_PROFILE = gql`
  query GetPublicProfile($userId: Int!) {
    publicProfile(userId: $userId) {
      id
      displayName
      email
      phone
      role
      provider {
        id
        name
        slug
        bio
        location
        lat
        lng
        logoImage {
          id
          cdnUrl
        }
        isRealtimeActive
        hasSchedule
        completedOrdersCount
        priority
        rut
        services {
          id
          price
          hasHomeVisit
          description
          slug
          serviceId
          service {
            id
            name
            slug
            description
          }
        }
        reviews {
          id
          rating
          comment
          createdAt
          client {
            id
            displayName
          }
        }
        realtimeReviews {
          id
          rating
          comment
          createdAt
          clientId
          client {
            id
            displayName
          }
        }
        certificates {
          id
          title
          institution
          year
          verified
          fileImage {
            id
            cdnUrl
          }
        }
        portfolio {
          id
          title
          description
          imageUrl
          image {
            id
            cdnUrl
          }
          createdAt
        }
        hobbys {
          id
          name
        }
      }
    }
  }
`;

export const GET_SERVICE_DETAIL = gql`
  query GetServiceDetail($serviceId: Int!, $providerId: Int!) {
    serviceDetail(serviceId: $serviceId, providerId: $providerId) {
      id
      description
      price
      hasHomeVisit
      commission
      netAmount
      slug
      service {
        id
        name
        slug
        image {
          id
          cdnUrl
        }
      }
      provider {
        id
        name
        location
      logoImage {
        id
        cdnUrl
      }
      reviews {
          id
          rating
          comment
          createdAt
          client {
            displayName
          }
        }
      }
    }
  }
`;

export const GET_PROVIDERS = gql`
  query GetProviders {
    providers {
      id
      name
      slug
      location
      lat
      lng
      logoImage {
        id
        cdnUrl
      }
      isRealtimeActive
      priority
      hasSchedule
      services {
        id
        price
        hasHomeVisit
        description
        slug
        service {
          id
          name
          slug
        }
        cities {
          city
        }
      }
    }
  }
`;

export const GET_PROVIDER_DAILY_AVAILABILITY = gql`
  query GetProviderDailyAvailability($date: String!, $providerId: Int!) {
    providerDailyAvailability(date: $date, providerId: $providerId) {
      date
      slots
      availableSlots
      occupiedSlots
    }
  }
`;

export const REGISTER_PROVIDER = gql`
  mutation RegisterProvider($input: CreateProviderInput!) {
    registerProvider(input: $input) {
      accessToken
      user {
        id
        role
      }
    }
  }
`;

export const CREATE_SERVICE_CONTACT_REQUEST = gql`
  mutation CreateServiceContactRequest($input: CreateContactRequestInput!) {
    createServiceContactRequest(input: $input) {
      id
      status
    }
  }
`;

export const GET_MY_PORTFOLIO = gql`
  query GetMyPortfolio {
    myPortfolio {
      id
      title
      description
      imageUrl
      position
      image {
        id
        cdnUrl
      }
      createdAt
    }
  }
`;

export const ADD_PROVIDER_PORTFOLIO_ITEM = gql`
  mutation AddProviderPortfolioItem($input: CreateProviderPortfolioInput!) {
    addProviderPortfolioItem(input: $input) {
      id
      title
      description
      imageUrl
      position
      image {
        id
        cdnUrl
      }
      createdAt
    }
  }
`;

export const UPDATE_PROVIDER_PORTFOLIO_ITEM = gql`
  mutation UpdateProviderPortfolioItem($input: UpdateProviderPortfolioInput!) {
    updateProviderPortfolioItem(input: $input) {
      id
      title
      description
      imageUrl
      position
      image {
        id
        cdnUrl
      }
      createdAt
    }
  }
`;

export const DELETE_PROVIDER_PORTFOLIO_ITEM = gql`
  mutation DeleteProviderPortfolioItem($id: Int!) {
    deleteProviderPortfolioItem(id: $id)
  }
`;
