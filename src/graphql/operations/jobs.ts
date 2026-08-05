import { gql } from '@apollo/client';

export const MY_JOBS = gql`
  query MyJobs {
    myJobs {
      id
      title
      description
      price
      location
      createdAt
      updatedAt
      applications {
        id
        message
        status
        worker {
          id
          displayName
        }
      }
      orders {
        id
        status
        worker {
          id
          displayName
        }
      }
    }
  }
`;

export const MY_APPLICATIONS = gql`
  query MyApplications {
    myApplications {
      id
      message
      status
      job {
        id
        title
        description
        price
        location
        user {
          id
          displayName
        }
      }
    }
  }
`;

export const GET_JOBS = gql`
  query GetJobs($city: String, $skip: Int!, $take: Int!) {
    jobs(city: $city, skip: $skip, take: $take) {
      id
      title
      description
      price
      location
      createdAt
      user {
        id
        displayName
      }
      reviews {
        id
        rating
        comment
      }
    }
  }
`;

export const GET_JOB = gql`
  query GetJob($id: Int!) {
    job(id: $id) {
      id
      title
      description
      price
      location
      createdAt
      user {
        id
        displayName
      }
      applications {
        id
        message
        status
        worker {
          id
          displayName
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
    }
  }
`;

export const CREATE_JOB = gql`
  mutation CreateJob($input: CreateJobInput!) {
    createJob(input: $input) {
      id
      title
      price
    }
  }
`;

export const UPDATE_JOB = gql`
  mutation UpdateJob($input: UpdateJobInput!) {
    updateJob(input: $input) {
      id
      title
      price
    }
  }
`;

export const REMOVE_JOB = gql`
  mutation RemoveJob($id: Int!) {
    removeJob(id: $id) {
      id
    }
  }
`;

export const APPLY_TO_JOB = gql`
  mutation ApplyToJob($jobId: Int!, $message: String) {
    applyToJob(jobId: $jobId, message: $message) {
      id
      message
      status
    }
  }
`;

export const CREATE_ORDER_JOB_WITH_PAYMENT = gql`
  mutation CreateOrderJobWithPayment($input: CreateOrderJobInput!) {
    createOrderJobWithPayment(input: $input) {
      id
      status
      total
    }
  }
`;

export const INIT_FLOW_JOB = gql`
  mutation InitFlowJob($orderJobId: Int!, $returnUrl: String!) {
    initFlowJob(orderJobId: $orderJobId, returnUrl: $returnUrl) {
      url
      token
    }
  }
`;

export const CREATE_REVIEW_JOB = gql`
  mutation CreateReviewJob($input: CreateReviewsJobInput!) {
    createReviewJob(input: $input) {
      id
      rating
      comment
    }
  }
`;
