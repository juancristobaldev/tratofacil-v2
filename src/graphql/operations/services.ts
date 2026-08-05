import { gql } from '@apollo/client';

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
