'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import { telemetry } from '@/lib/telemetry';

interface LeadFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  employees: string;
  country: string;
}

export function LeadForm() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<LeadFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    website: '',
    employees: '',
    country: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof LeadFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Track form submission
      telemetry.track('lead_form_submitted', {
        company: formData.company,
        employees: formData.employees,
        country: formData.country
      });

      // TODO: Implement actual form submission logic
      console.log('Form submitted:', formData);
      
      // Show success message or redirect
      alert('¡Gracias por tu interés! Te contactaremos pronto.');
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        company: '',
        website: '',
        employees: '',
        country: ''
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Hubo un error al enviar el formulario. Por favor, inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const countries = [
    'Colombia', 'México', 'Argentina', 'Chile', 'Perú', 'España', 'Estados Unidos', 'Canadá', 'Brasil', 'Ecuador'
  ];

  const employeeRanges = [
    '1-10 empleados',
    '11-50 empleados', 
    '51-200 empleados',
    '201-500 empleados',
    '501-1000 empleados',
    '1000+ empleados'
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Solicita una demo gratuita
        </h3>
        <p className="text-gray-600 text-sm">
          Descubre cómo Briki puede transformar tu proceso de seguros con IA.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* First row: First Name & Last Name */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
              Nombre *
            </Label>
            <Input
              id="firstName"
              type="text"
              required
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              className="mt-1"
              placeholder="Tu nombre"
            />
          </div>
          <div>
            <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
              Apellido *
            </Label>
            <Input
              id="lastName"
              type="text"
              required
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              className="mt-1"
              placeholder="Tu apellido"
            />
          </div>
        </div>

        {/* Second row: Email & Phone */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="mt-1"
              placeholder="tu@empresa.com"
            />
          </div>
          <div>
            <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
              Teléfono *
            </Label>
            <Input
              id="phone"
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="mt-1"
              placeholder="+57 300 123 4567"
            />
          </div>
        </div>

        {/* Third row: Company & Website */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="company" className="text-sm font-medium text-gray-700">
              Empresa *
            </Label>
            <Input
              id="company"
              type="text"
              required
              value={formData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              className="mt-1"
              placeholder="Nombre de tu empresa"
            />
          </div>
          <div>
            <Label htmlFor="website" className="text-sm font-medium text-gray-700">
              Sitio web *
            </Label>
            <Input
              id="website"
              type="url"
              required
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              className="mt-1"
              placeholder="https://tuempresa.com"
            />
          </div>
        </div>

        {/* Employees dropdown */}
        <div>
          <Label htmlFor="employees" className="text-sm font-medium text-gray-700">
            Número de empleados *
          </Label>
          <Select value={formData.employees} onValueChange={(value) => handleInputChange('employees', value)}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Selecciona un rango" />
            </SelectTrigger>
            <SelectContent>
              {employeeRanges.map((range) => (
                <SelectItem key={range} value={range}>
                  {range}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Country dropdown */}
        <div>
          <Label htmlFor="country" className="text-sm font-medium text-gray-700">
            País de la empresa *
          </Label>
          <Select value={formData.country} onValueChange={(value) => handleInputChange('country', value)}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Selecciona tu país" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country} value={country}>
                  {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Privacy notice */}
        <div className="text-xs text-gray-500 leading-relaxed">
          Nos comprometemos con tu privacidad. Briki usa la información que nos proporcionas para contactarte sobre nuestro contenido, productos y servicios relevantes. Puedes darte de baja de estas comunicaciones en cualquier momento. Para más información, consulta nuestra{' '}
          <a href="/privacy" className="text-blue-600 hover:underline">
            Política de Privacidad
          </a>
          .
        </div>

        {/* Submit button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white font-medium py-3"
        >
          {isSubmitting ? 'Enviando...' : 'Solicitar demo gratuita'}
        </Button>
      </form>
    </div>
  );
}
