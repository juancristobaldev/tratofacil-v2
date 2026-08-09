import { gql } from '@apollo/client';

export const CREATE_SUPPORT_TICKET = gql`
  mutation CreateSupportTicket($input: CreateSupportTicketInput!) {
    createSupportTicket(input: $input) {
      id
      email
      subject
      message
      status
      createdAt
    }
  }
`;
