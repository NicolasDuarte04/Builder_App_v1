import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface MembershipData {
  membership: {
    tier: 'free' | 'premium';
    status: string;
    endDate: string | null;
    isPremium: boolean;
  };
  policies: {
    count: number;
    limit: string | number;
    remaining: string | number;
    canSaveMore: boolean;
  };
}

export function useMembership() {
  const { data: session } = useSession();
  const [data, setData] = useState<MembershipData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembership = async () => {
    if (!session?.user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/user/membership');
      
      if (!response.ok) {
        throw new Error('Failed to fetch membership status');
      }

      const membershipData = await response.json();
      setData(membershipData);
    } catch (err: any) {
      console.error('Error fetching membership:', err);
      setError(err.message || 'Failed to fetch membership status');
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = () => {
    fetchMembership();
  };

  useEffect(() => {
    fetchMembership();
  }, [session]);

  return {
    data,
    isLoading,
    error,
    refetch,
    membership: data?.membership,
    policies: data?.policies,
    tier: data?.membership.tier || 'free',
    policyCount: data?.policies.count || 0,
    limit: typeof data?.policies.limit === 'number' ? data.policies.limit : 4,
    isPremium: data?.membership.isPremium || false,
    canSaveMore: data?.policies.canSaveMore || false,
  };
}
