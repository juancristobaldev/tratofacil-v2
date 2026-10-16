import { gql } from '@apollo/client';

export const GET_PROVIDER_PLAN = gql`
  query GetProviderPlan {
    myProviderPlan {
      plan
    }
  }
`;

export const MY_SERVICES = gql`
  query MyServices {
    myServices {
      id
      name
      slug
      description
      imageUrl
      image {
        id
        cdnUrl
      }
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
        providerId
        slug
        serviceId
        isCertified
        portfolio {
          id
          title
          description
          imageUrl
          image {
            id
            cdnUrl
          }
        }
        certificates {
          id
          title
          institution
          year
          verified
          fileUrl
        }
        cities {
          city
        }
      }
    }
  }
`;

export const CREATE_SERVICE = gql`
  mutation CreateService($input: CreateServiceInput!) {
    createService(input: $input) {
      id
      price
      hasHomeVisit
      description
      slug
      providerId
      serviceId
      service {
        id
        name
        slug
      }
    }
  }
`;

export const UPDATE_SERVICE = gql`
  mutation UpdateService($id: Int!, $input: UpdateServiceInput!) {
    updateService(id: $id, input: $input) {
      id
      price
      hasHomeVisit
      description
      slug
    }
  }
`;

export const DELETE_SERVICE = gql`
  mutation DeleteService($id: Int!) {
    deleteService(id: $id)
  }
`;
