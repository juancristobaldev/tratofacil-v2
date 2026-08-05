import { gql } from '@apollo/client';

export const GET_PRODUCTS = gql`
  query GetProducts {
    products {
      id
      name
      slug
      price
      stock
      description
      location
      categoryProductId
      subCategorySlug
      images {
        id
        url
        image {
          id
          cdnUrl
        }
      }
      user {
        id
        displayName
        provider {
          id
          name
        }
      }
      deliveryCondition {
        id
        deliveryType
        shippingPayer
        maxDispatchDays
      }
    }
  }
`;

export const GET_PRODUCT = gql`
  query GetProduct($id: Int!) {
    product(id: $id) {
      id
      name
      slug
      price
      stock
      description
      location
      categoryProductId
      subCategorySlug
      categoryProduct {
        id
        name
        slug
        shippingDisabled
      }
      images {
        id
        url
        image {
          id
          cdnUrl
        }
      }
      user {
        id
        displayName
        identitys {
          id
          status
        }
      }
      deliveryCondition {
        id
        deliveryType
        shippingPayer
        maxDispatchDays
        confirmationDeadline
      }
    }
  }
`;

export const GET_PRODUCT_BY_SLUG = gql`
  query GetProductBySlug($slug: String!) {
    productBySlug(slug: $slug) {
      id
      name
      price
      stock
      description
      location
      subCategorySlug
      categoryProduct {
        shippingDisabled
      }
      images {
        id
        image { id cdnUrl }
      }
      user {
        id
        displayName
        provider {
          id
          name
        }
      }
      deliveryCondition {
        id
        deliveryType
        shippingPayer
        maxDispatchDays
      }
    }
  }
`;

export const CREATE_PRODUCT = gql`
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
      name
      slug
      price
    }
  }
`;

export const UPDATE_PRODUCT = gql`
  mutation UpdateProduct($input: UpdateProductInput!) {
    updateProduct(input: $input) {
      id
      name
      price
      stock
    }
  }
`;

export const REMOVE_PRODUCT = gql`
  mutation RemoveProduct($id: Int!) {
    removeProduct(id: $id) {
      id
    }
  }
`;

export const GET_CATEGORIES_PRODUCTS = gql`
  query GetCategoriesProducts($city: String) {
    categoriesProducts(city: $city) {
      id
      name
      slug
      shippingDisabled
      subCategories {
        id
        name
        slug
      }
    }
  }
`;

export const GET_MARKETPLACE_DATA = gql`
  query GetMarketplaceData($city: String) {
    categoriesProducts(city: $city) {
      id
      name
      slug
      subCategories {
        id
        name
        slug
      }
      products {
        id
        name
        slug
        price
        location
        stock
        description
        categoryProductId
        subCategorySlug
        user {
          id
          displayName
          identitys {
            status
          }
        }
        images {
          id
          url
          image { id cdnUrl }
        }
        deliveryCondition {
          id
          deliveryType
          shippingPayer
          maxDispatchDays
          confirmationDeadline
        }
      }
    }
  }
`;

export const CREATE_ORDER_PRODUCT_WITH_PAYMENT = gql`
  mutation CreateOrderProductWithPayment($input: CreateOrderProductInput!, $shippingInput: CreateShippingInfoInput!) {
    createOrderProductWithPayment(input: $input, shippingInput: $shippingInput) {
      id
      status
      total
    }
  }
`;

export const INIT_FLOW_PRODUCT = gql`
  mutation InitFlowProduct($orderProductId: Int!, $returnUrl: String!) {
    initFlowProduct(orderProductId: $orderProductId, returnUrl: $returnUrl) {
      url
      token
    }
  }
`;

export const CONFIRM_FLOW_PRODUCT = gql`
  mutation ConfirmFlowProduct($token: String!) {
    confirmFlowProduct(token: $token) {
      id
      status
    }
  }
`;
