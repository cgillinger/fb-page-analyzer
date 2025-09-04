import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { 
  UploadCloud, 
  FileWarning, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Calendar,
  TrendingUp,
  X,
  RefreshCw
} from 'lucide-react';

// Import services från tidigare faser
import { processMultipleFacebookCSVs } from '../core/csv_processor.js';
import { validateMultipleFiles, formatValidationSummary } from '../utils/period_validator.js';
import { extractPeriodsFromFiles, formatPeriodForDisplay } from '../core/period_extractor.js';
import { saveMonthlyDataBatch, getAllPeriods } from '../utils/timeseries_storage.js';

/**
 * TimeseriesUploader - Drag-drop interface för multiple Facebook API CSV-filer
 * Integrerar med alla services från FAS 2-4 för komplett upload-flöde
 */
export function TimeseriesUploader({ onDataUploaded, onCancel }) {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [error, setError] = useState(null);
  const [existingPeriods, setExistingPeriods] = useState([]);
  const fileInputRef = useRef(null);

  // Ladda befintliga perioder vid montering
  React.useEffect(() => {
    loadExistingPeriods();
  }, []);

  const loadExistingPeriods = async () => {
    try {
      const periods = await getAllPeriods();
      setExistingPeriods(periods);
    } catch (error) {
      console.warn('Kunde inte ladda befintliga perioder:', error);
    }
  };

  // Hantera filvälj (drag-drop eller browse)
  const handleFileSelection = useCallback(async (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    
    setError(null);
    setValidationResult(null);
    setProcessedData(null);
    
    const fileArray = Array.from(selectedFiles);
    setFiles(fileArray);
    
    // Validera filer direkt
    try {
      const validation = await validateMultipleFiles(fileArray);
      setValidationResult(validation);
      
      if (!validation.isValid) {
        setError('En eller flera filer har valideringsfel. Se detaljer nedan.');
      }
    } catch (validationError) {
      setError(`Valideringsfel: ${validationError.message}`);
    }
  }, []);

  // Drag-and-drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(file => 
      file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')
    );
    
    if (droppedFiles.length === 0) {
      setError('Endast CSV-filer stöds. Kontrollera filformatet.');
      return;
    }
    
    handleFileSelection(droppedFiles);
  }, [handleFileSelection]);

  // Browse-knapp handler
  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e) => {
    handleFileSelection(e.target.files);
  };

  // Ta bort fil från listan
  const removeFile = (indexToRemove) => {
    const updatedFiles = files.filter((_, index) => index !== indexToRemove);
    setFiles(updatedFiles);
    
    if (updatedFiles.length === 0) {
      setValidationResult(null);
      setError(null);
    } else {
      // Re-validera återstående filer
      handleFileSelection(updatedFiles);
    }
  };

  // Starta processering av filer
  const handleProcessFiles = async () => {
    if (!files.length || !validationResult?.isValid) {
      setError('Kan inte processera filer med valideringsfel');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Steg 1: Extrahera perioder för progress tracking
      setUploadProgress({ stage: 'extracting', message: 'Analyserar filer...', progress: 10 });
      const periods = extractPeriodsFromFiles(files, true);
      
      // Steg 2: Processera CSV-data
      setUploadProgress({ stage: 'processing', message: 'Processerar CSV-data...', progress: 30 });
      const processingResult = await processMultipleFacebookCSVs(files);
      
      if (processingResult.errors.length > 0) {
        console.warn('Processering med varningar:', processingResult.errors);
      }
      
      // Steg 3: Spara data till storage
      setUploadProgress({ stage: 'saving', message: 'Sparar data...', progress: 60 });
      
      // Extrahera all månadsdata från dataset
      const allMonthlyData = [];
      for (const result of processingResult.results) {
        allMonthlyData.push(...result.data);
      }
      
      const saveResult = await saveMonthlyDataBatch(allMonthlyData);
      
      // Steg 4: Slutföra
      setUploadProgress({ stage: 'complete', message: 'Uppladdning slutförd!', progress: 100 });
      
      // Skapa sammanfattning för användaren
      const summary = {
        totalFiles: processingResult.summary.totalFiles,
        successfulFiles: processingResult.summary.successfulFiles,
        totalPages: processingResult.summary.totalPages,
        totalPeriods: processingResult.summary.totalPeriods,
        periodsUploaded: periods,
        dataCount: allMonthlyData.length,
        saveResult,
        processingErrors: processingResult.errors
      };
      
      setProcessedData(summary);
      
      // Uppdatera befintliga perioder
      await loadExistingPeriods();
      
      // Notify parent component
      if (onDataUploaded) {
        onDataUploaded(summary);
      }
      
    } catch (error) {
      console.error('Processering misslyckades:', error);
      setError(`Processering misslyckades: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setUploadProgress(null);
    }
  };

  // Reset uploader
  const handleReset = () => {
    setFiles([]);
    setValidationResult(null);
    setError(null);
    setProcessedData(null);
    setUploadProgress(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-primary" />
            Ladda Facebook API Data
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Dra och släpp Facebook API CSV-filer här, eller klicka för att bläddra. 
            Filformat: FB_YYYY_MM.csv (t.ex. FB_2025_08.csv)
          </p>
        </CardHeader>
        <CardContent>
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
              files.length > 0 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50 hover:bg-primary/5'
            }`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleBrowseClick}
          >
            <input
              type="file"
              accept=".csv"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileInputChange}
            />
            
            <div className="flex flex-col items-center space-y-4">
              {files.length > 0 ? (
                <FileText className="w-12 h-12 text-primary" />
              ) : (
                <UploadCloud className="w-12 h-12 text-muted-foreground" />
              )}
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  {files.length > 0 
                    ? `${files.length} fil${files.length !== 1 ? 'er' : ''} vald${files.length !== 1 ? 'a' : ''}`
                    : 'Välj Facebook API CSV-filer'
                  }
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Stödjer flera filer samtidigt. Varje fil ska representera en månad av data.
                </p>
              </div>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium mb-3">Valda filer ({files.length})</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {files.map((file, index) => {
                  const fileValidation = validationResult?.fileResults?.[index];
                  const period = fileValidation?.period;
                  
                  return (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`flex-shrink-0 ${
                          fileValidation?.isValid !== false 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {fileValidation?.isValid !== false ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <AlertCircle className="w-4 h-4" />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="font-medium text-sm">{file.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                            {period && (
                              <span className="ml-2">
                                • {formatPeriodForDisplay(period)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        disabled={isProcessing}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Valideringsresultat</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className={validationResult.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
              {validationResult.isValid ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertTitle className={validationResult.isValid ? 'text-green-800' : 'text-red-800'}>
                {formatValidationSummary(validationResult).message}
              </AlertTitle>
              {formatValidationSummary(validationResult).details && (
                <AlertDescription className={validationResult.isValid ? 'text-green-700' : 'text-red-700'}>
                  {formatValidationSummary(validationResult).details}
                </AlertDescription>
              )}
            </Alert>
            
            {validationResult.summary && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-medium">Totalt filer</div>
                  <div className="text-muted-foreground">{validationResult.summary.totalFiles}</div>
                </div>
                <div>
                  <div className="font-medium">Giltiga</div>
                  <div className="text-green-600">{validationResult.summary.validFiles}</div>
                </div>
                <div>
                  <div className="font-medium">Ogiltiga</div>
                  <div className="text-red-600">{validationResult.summary.invalidFiles}</div>
                </div>
                <div>
                  <div className="font-medium">Perioder</div>
                  <div className="text-primary">{validationResult.summary.periodsDetected}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Processing Progress */}
      {uploadProgress && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <div className="flex-1">
                <div className="font-medium">{uploadProgress.message}</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Results */}
      {processedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Uppladdning slutförd
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Data sparad framgångsrikt</AlertTitle>
              <AlertDescription className="text-green-700">
                {processedData.dataCount} månadsdata-poster från {processedData.successfulFiles} filer har sparats.
              </AlertDescription>
            </Alert>
            
            {/* Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Calendar className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <div className="font-bold text-lg text-blue-900">{processedData.totalPeriods}</div>
                <div className="text-sm text-blue-700">Månader</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <TrendingUp className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                <div className="font-bold text-lg text-purple-900">{processedData.totalPages}</div>
                <div className="text-sm text-purple-700">Facebook-sidor</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <FileText className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <div className="font-bold text-lg text-green-900">{processedData.successfulFiles}</div>
                <div className="text-sm text-green-700">Filer processerade</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                <div className="font-bold text-lg text-orange-900">{processedData.dataCount}</div>
                <div className="text-sm text-orange-700">Dataposter</div>
              </div>
            </div>
            
            {/* Uploaded Periods Table */}
            {processedData.periodsUploaded.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Uppladdade perioder</h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>År</TableHead>
                        <TableHead>Månad</TableHead>
                        <TableHead>Filnamn</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processedData.periodsUploaded.map((period, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {formatPeriodForDisplay(period)}
                          </TableCell>
                          <TableCell>{period.year}</TableCell>
                          <TableCell>{period.month}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {period.filename}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            
            {/* Processing Warnings */}
            {processedData.processingErrors.length > 0 && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-800">Varningar under processering</AlertTitle>
                <AlertDescription className="text-yellow-700">
                  <div className="space-y-1">
                    {processedData.processingErrors.map((error, index) => (
                      <div key={index} className="text-sm">
                        • {error.filename}: {error.error}
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fel vid uppladdning</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
          {processedData ? 'Stäng' : 'Avbryt'}
        </Button>
        
        <div className="space-x-2">
          {processedData ? (
            <Button onClick={handleReset}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Ladda fler filer
            </Button>
          ) : files.length > 0 ? (
            <>
              <Button variant="outline" onClick={handleReset} disabled={isProcessing}>
                Rensa filer
              </Button>
              <Button 
                onClick={handleProcessFiles}
                disabled={!validationResult?.isValid || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processerar...
                  </>
                ) : (
                  `Processera ${files.length} fil${files.length !== 1 ? 'er' : ''}`
                )}
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}