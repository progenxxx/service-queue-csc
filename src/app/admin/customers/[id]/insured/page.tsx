'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, UserCheck, BarChart3, Settings, ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface InsuredAccount {
  id: string;
  insuredName: string;
  primaryContactName: string;
  contactEmail: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zipcode: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

interface Company {
  id: string;
  companyName: string;
  companyCode: string;
  primaryContact: string;
  phone: string;
  email: string;
}

const navigation = [
  { name: 'All Customers', href: '/admin/customers', icon: Building2, current: false },
  { name: 'Customer Management', href: '/admin/customers/manage', icon: UserCheck, current: true },
  { name: 'All Requests', href: '/admin', icon: Building2, current: false },
  { name: 'Reports', href: '/admin/reports', icon: BarChart3, current: false },
  { name: 'Agent Management', href: '/admin/agents', icon: Settings, current: false },
  { name: 'Settings', href: '/admin/settings', icon: Settings, current: false },
];

export default function AdminInsuredAccountsPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();
  const customerId = params.id as string;

  const [insuredAccounts, setInsuredAccounts] = useState<InsuredAccount[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<InsuredAccount[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  useEffect(() => {
    fetchCompanyDetails();
    fetchInsuredAccounts();
  }, [customerId]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredAccounts(insuredAccounts);
    } else {
      const filtered = insuredAccounts.filter(account =>
        account.insuredName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.primaryContactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredAccounts(filtered);
    }
  }, [searchTerm, insuredAccounts]);

  const fetchCompanyDetails = async () => {
    try {
      const response = await fetch(`/api/admin/customers/${customerId}`);
      if (response.ok) {
        const data = await response.json();
        setCompany(data.company);
      }
    } catch (error) {
      console.error('Failed to fetch company details:', error);
    }
  };

  const fetchInsuredAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/customers/${customerId}/insured`);
      if (response.ok) {
        const data = await response.json();
        setInsuredAccounts(data.insuredAccounts || []);
        setFilteredAccounts(data.insuredAccounts || []);
      } else {
        showToast('Failed to fetch insured accounts', 'error');
      }
    } catch (error) {
      console.error('Failed to fetch insured accounts:', error);
      showToast('Failed to fetch insured accounts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this insured account?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/customers/${customerId}/insured/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showToast('Insured account deleted successfully', 'success');
        fetchInsuredAccounts();
      } else {
        showToast('Failed to delete insured account', 'error');
      }
    } catch (error) {
      console.error('Failed to delete insured account:', error);
      showToast('Failed to delete insured account', 'error');
    }
  };

  return (
    <DashboardLayout navigation={navigation} title="">
      <div className="space-y-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/customers/manage')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Customers</span>
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Insured Accounts</h1>
        </div>

        <Card className="shadow-sm border-0 bg-white">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="w-full sm:w-96">
                <Input
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-gray-200"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => router.push(`/admin/customers/${customerId}/insured/add`)}
                  className="bg-[#068d1f] hover:bg-[#087055] text-white"
                >
                  Add Insured Account
                </Button>
                <Button
                  onClick={() => setShowBulkUpload(true)}
                  className="bg-[#068d1f] hover:bg-[#087055] text-white"
                >
                  Bulk Upload
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-[#087055]" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#087055] hover:bg-[#087055]">
                      <TableHead className="text-white font-medium">Insured Name</TableHead>
                      <TableHead className="text-white font-medium">Primary Contact Name</TableHead>
                      <TableHead className="text-white font-medium">Phone</TableHead>
                      <TableHead className="text-white font-medium">Contact Email</TableHead>
                      <TableHead className="text-white font-medium">Address</TableHead>
                      <TableHead className="text-white font-medium text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAccounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                          {searchTerm ? 'No insured accounts found matching your search.' : 'No insured accounts found for this customer.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAccounts.map((account) => (
                        <TableRow key={account.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{account.insuredName}</TableCell>
                          <TableCell>{account.primaryContactName}</TableCell>
                          <TableCell>{account.phone}</TableCell>
                          <TableCell>{account.contactEmail}</TableCell>
                          <TableCell>{account.street}, {account.city}, {account.state} {account.zipcode}</TableCell>
                          <TableCell>
                            <div className="flex gap-2 justify-center">
                              <Button
                                size="sm"
                                onClick={() => router.push(`/admin/customers/${customerId}/insured/${account.id}`)}
                                className="bg-[#068d1f] hover:bg-[#087055] text-white"
                              >
                                View Details
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(account.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {showBulkUpload && (
          <BulkUploadModal
            customerId={customerId}
            onClose={() => setShowBulkUpload(false)}
            onSuccess={() => {
              setShowBulkUpload(false);
              fetchInsuredAccounts();
            }}
            showToast={showToast}
          />
        )}
      </div>
      <ToastContainer />
    </DashboardLayout>
  );
}

function BulkUploadModal({ customerId, onClose, onSuccess, showToast }: { customerId: string; onClose: () => void; onSuccess: () => void; showToast: (message: string, type: 'success' | 'error') => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDownloadTemplate = () => {
    // Create CSV content with headers and sample data
    const csvContent = `Insured Name,Primary Contact Name,Contact Email,Phone,Street,City,State,Zipcode
ABC Insurance Corp,John Smith,john.smith@abcinsurance.com,555-0101,123 Main Street,Springfield,IL,62701
XYZ Coverage Inc,Jane Doe,jane.doe@xyzcoverage.com,555-0102,456 Oak Avenue,Chicago,IL,60601`;

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'insured_accounts_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showToast('Please select a file', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('companyId', customerId);

      const response = await fetch(`/api/admin/customers/${customerId}/insured/bulk-upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        showToast('Bulk upload successful', 'success');
        onSuccess();
      } else {
        const data = await response.json();
        showToast(data.error || 'Bulk upload failed', 'error');
      }
    } catch (error) {
      console.error('Bulk upload error:', error);
      showToast('Bulk upload failed', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Upload Insured Contact Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">
            ×
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          .xlsx, .csv, .xls formats. Up to 50MB. <button onClick={handleDownloadTemplate} className="text-blue-600 underline hover:text-blue-800">Download Template</button>
        </p>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4 hover:border-[#068d1f] transition-colors">
          <input
            type="file"
            accept=".xlsx,.csv,.xls"
            onChange={handleFileSelect}
            className="hidden"
            id="admin-bulk-file-upload"
          />
          <label htmlFor="admin-bulk-file-upload" className="cursor-pointer">
            <div className="text-gray-600">
              {selectedFile ? (
                <p className="font-medium">{selectedFile.name}</p>
              ) : (
                <p>Click to select file or drag and drop</p>
              )}
            </div>
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={isUploading || !selectedFile}
            className="bg-[#068d1f] hover:bg-[#087055] text-white"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
