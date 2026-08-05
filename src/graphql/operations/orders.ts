import { gql } from '@apollo/client';

export const MY_ORDERS = gql`
  query MyOrders {
    myOrders {
      services {
        id
        status
        total
        createdAt
        scheduledAt
        clientAddress
        serviceProvider {
          id
          service { id name }
          provider { id name logoImage { id cdnUrl } }
        }
      }
      products {
        id
        status
        total
        quantity
        unitPrice
        createdAt
        commission
        shippingCompany
        trackingCode
        product {
          id
          name
          images { id image { id cdnUrl } url }
          user { id displayName provider { id name } }
        }
        shippingInfo {
          id
          street
          number
          commune
          region
          phone
        }
      }
      jobs {
        id
        status
        total
        createdAt
        job { id title location }
        worker { id displayName }
      }
    }
  }
`;

export const GET_MY_SALES = gql`
  query GetMySales {
    getMySales {
      id
      status
      total
      quantity
      unitPrice
      createdAt
      commission
      shippingCompany
      trackingCode
      product {
        id
        name
        images { id image { id cdnUrl } url }
      }
      client {
        id
        displayName
        reviewsReceived {
          id
          rating
        }
      }
      shippingInfo {
        id
        street
        number
        commune
        region
        phone
      }
    }
  }
`;

export const UPDATE_ORDER_PRODUCT_SHIPPING = gql`
  mutation UpdateOrderProductShipping($input: UpdateShippingInput!) {
    updateOrderProductShipping(input: $input) {
      id
      shippingCompany
      trackingCode
    }
  }
`;

export const UPDATE_ORDER_PRODUCT_STATUS = gql`
  mutation UpdateOrderProductStatus($orderId: Int!, $status: OrderStatus!) {
    updateOrderProductStatus(orderId: $orderId, status: $status) {
      id
      status
    }
  }
`;

export const UPDATE_ORDER_SERVICE_STATUS = gql`
  mutation UpdateOrderServiceStatus($orderId: Int!, $status: OrderStatus!) {
    updateOrderServiceStatus(orderId: $orderId, status: $status) {
      id
      status
    }
  }
`;

export const UPDATE_ORDER_JOB_STATUS = gql`
  mutation UpdateOrderJobStatus($orderId: Int!, $status: OrderStatus!) {
    updateOrderJobStatus(orderId: $orderId, status: $status) {
      id
      status
    }
  }
`;
