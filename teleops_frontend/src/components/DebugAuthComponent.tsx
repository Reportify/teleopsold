import React, { useState } from 'react';
import { debugAuthState, debugApiHeaders, debugVendorRelationshipsCall } from '../utils/debugAuth';
import vendorService from '../services/vendorService';

const DebugAuthComponent: React.FC = () => {
  const [debugResults, setDebugResults] = useState<any>(null);
  const [apiTestResults, setApiTestResults] = useState<any>(null);
  const [vendorServiceResults, setVendorServiceResults] = useState<any>(null);

  const handleDebugAuth = () => {
    const results = debugAuthState();
    setDebugResults(results);
  };

  const handleTestApiCall = async () => {
    const results = await debugVendorRelationshipsCall();
    setApiTestResults(results);
  };

  const handleTestVendorService = async () => {
    try {
      console.log('🔍 Testing VendorService.getCurrentVendorRelationshipId()');
      const relationshipId = await vendorService.getCurrentVendorRelationshipId();
      console.log('✅ VendorService result:', relationshipId);
      setVendorServiceResults({ success: true, relationshipId });
    } catch (error: any) {
      console.log('❌ VendorService error:', error);
      setVendorServiceResults({ success: false, error: error.message });
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px solid #ff6b6b', 
      margin: '20px', 
      backgroundColor: '#fff5f5',
      borderRadius: '8px'
    }}>
      <h2 style={{ color: '#d63031' }}>🔍 Authentication Debug Panel</h2>
      <p style={{ color: '#636e72', fontSize: '14px' }}>
        This component helps debug the 401 error in getCurrentVendorRelationshipId function.
        <br />
        <strong>Remove this component after debugging!</strong>
      </p>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleDebugAuth}
          style={{
            padding: '10px 15px',
            backgroundColor: '#0984e3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            marginRight: '10px',
            cursor: 'pointer'
          }}
        >
          Debug Auth State
        </button>
        
        <button 
          onClick={handleTestApiCall}
          style={{
            padding: '10px 15px',
            backgroundColor: '#00b894',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            marginRight: '10px',
            cursor: 'pointer'
          }}
        >
          Test API Call
        </button>
        
        <button 
          onClick={handleTestVendorService}
          style={{
            padding: '10px 15px',
            backgroundColor: '#e17055',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test Vendor Service
        </button>
      </div>

      {debugResults && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '4px',
          border: '1px solid #dee2e6'
        }}>
          <h3>Auth State Results:</h3>
          <pre style={{ fontSize: '12px', overflow: 'auto' }}>
            {JSON.stringify(debugResults, null, 2)}
          </pre>
        </div>
      )}

      {apiTestResults && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: apiTestResults.success ? '#d4edda' : '#f8d7da', 
          borderRadius: '4px',
          border: `1px solid ${apiTestResults.success ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          <h3>API Test Results:</h3>
          <pre style={{ fontSize: '12px', overflow: 'auto' }}>
            {JSON.stringify(apiTestResults, null, 2)}
          </pre>
        </div>
      )}

      {vendorServiceResults && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: vendorServiceResults.success ? '#d4edda' : '#f8d7da', 
          borderRadius: '4px',
          border: `1px solid ${vendorServiceResults.success ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          <h3>Vendor Service Results:</h3>
          <pre style={{ fontSize: '12px', overflow: 'auto' }}>
            {JSON.stringify(vendorServiceResults, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ 
        marginTop: '20px', 
        padding: '10px', 
        backgroundColor: '#fff3cd', 
        borderRadius: '4px',
        border: '1px solid #ffeaa7'
      }}>
        <h4>Instructions:</h4>
        <ol style={{ fontSize: '14px', margin: '10px 0' }}>
          <li>Click "Debug Auth State" to check authentication status</li>
          <li>Click "Test API Call" to test the direct API call</li>
          <li>Click "Test Vendor Service" to test the actual service method</li>
          <li>Check the browser console for detailed logs</li>
          <li>Compare results to identify the issue</li>
        </ol>
      </div>
    </div>
  );
};

export default DebugAuthComponent;