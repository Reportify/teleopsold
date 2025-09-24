// Debug utility to diagnose authentication issues
import { AuthService } from '../services/authService';

export const debugAuthState = () => {
  console.log('🔍 Authentication Debug Information:');
  console.log('=====================================');
  
  // Check access token
  const accessToken = AuthService.getAccessToken();
  console.log('📝 Access Token:', accessToken ? 'Present' : 'Missing');
  if (accessToken) {
    console.log('📝 Token Length:', accessToken.length);
    console.log('📝 Token Preview:', accessToken.substring(0, 20) + '...');
    
    // Check token format (basic validation)
  try {
    if (accessToken) {
      const tokenParts = accessToken.split('.');
      console.log('📝 Token Format Valid:', tokenParts.length === 3);
      console.log('📝 Token Length:', accessToken.length);
    }
  } catch (error) {
    console.log('📝 Token Validation Error:', error);
  }
  }
  
  // Check refresh token
  const refreshToken = AuthService.getRefreshToken();
  console.log('🔄 Refresh Token:', refreshToken ? 'Present' : 'Missing');
  
  // Check tenant context
  const tenantContext = AuthService.getTenantContext();
  console.log('🏢 Tenant Context:', tenantContext ? 'Present' : 'Missing');
  if (tenantContext) {
    console.log('🏢 Current Tenant:', tenantContext.currentTenant);
    console.log('🏢 Tenant ID:', tenantContext.currentTenant?.id);
    console.log('🏢 Tenant Type:', tenantContext.currentTenant?.tenant_type);
    console.log('🏢 Organization Name:', tenantContext.currentTenant?.organization_name);
  }
  
  // Check authentication status
  console.log('✅ Is Authenticated:', AuthService.isAuthenticated());
  console.log('👤 User Type:', AuthService.getUserType());
  console.log('👤 Is Vendor User:', AuthService.isVendorUser());
  
  // Check user profile
  const userProfile = AuthService.getUserProfile();
  console.log('👤 User Profile:', userProfile ? 'Present' : 'Missing');
  if (userProfile) {
    console.log('👤 Employee ID:', userProfile.employee_id);
    console.log('👤 Designation:', userProfile.designation?.designation_name);
  }
  
  console.log('=====================================');
  
  return {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    hasTenantContext: !!tenantContext,
    isAuthenticated: AuthService.isAuthenticated(),
    userType: AuthService.getUserType(),
    tenantId: tenantContext?.currentTenant?.id,
    tenantType: tenantContext?.currentTenant?.tenant_type
  };
};

export const debugApiHeaders = () => {
  console.log('🔍 API Headers Debug:');
  console.log('=====================');
  
  const token = AuthService.getAccessToken();
  const tenantContext = AuthService.getTenantContext();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('✅ Authorization header will be set');
  } else {
    console.log('❌ Authorization header will be missing');
  }
  
  if (tenantContext?.currentTenant) {
    headers['X-Tenant-ID'] = tenantContext.currentTenant.id;
    console.log('✅ X-Tenant-ID header will be set to:', tenantContext.currentTenant.id);
  } else {
    console.log('❌ X-Tenant-ID header will be missing');
  }
  
  console.log('📋 Final headers:', headers);
  console.log('=====================');
  
  return headers;
};

// Function to test the vendor relationships API call with debug info
export const debugVendorRelationshipsCall = async () => {
  console.log('🔍 Testing Vendor Relationships API Call');
  console.log('=========================================');
  
  // Debug auth state first
  const authState = debugAuthState();
  
  // Debug headers
  const headers = debugApiHeaders();
  
  // Check if we should proceed
  if (!authState.hasAccessToken) {
    console.log('❌ Cannot proceed: No access token');
    return { success: false, error: 'No access token' };
  }
  
  if (!authState.hasTenantContext) {
    console.log('❌ Cannot proceed: No tenant context');
    return { success: false, error: 'No tenant context' };
  }
  
  if (!authState.isAuthenticated) {
    console.log('❌ Cannot proceed: Not authenticated');
    return { success: false, error: 'Not authenticated' };
  }
  
  console.log('✅ Prerequisites met, making API call...');
  
  try {
    // Import api dynamically to avoid circular dependencies
    const { api } = await import('../services/api');
    
    const response = await api.get('/client-vendor-relationships/');
    
    console.log('✅ API call successful!');
    console.log('📊 Response status:', response.status);
    console.log('📊 Response data:', response.data);
    
    return { success: true, data: response.data };
  } catch (error: any) {
    console.log('❌ API call failed!');
    console.log('📊 Error status:', error.response?.status);
    console.log('📊 Error message:', error.message);
    console.log('📊 Error response:', error.response?.data);
    
    return { 
      success: false, 
      error: error.message,
      status: error.response?.status,
      response: error.response?.data
    };
  }
};