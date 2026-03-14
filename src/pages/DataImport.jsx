import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/api/client';
import { Upload, Database, Loader2, CheckCircle2, AlertCircle, Sparkles, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import fetchRealSumoData from '@/api/functions/fetchRealSumoData';
import fetchRealMatchHistory from '@/api/functions/fetchRealMatchHistory';
import fetchWrestlerPhotos from '@/api/functions/fetchWrestlerPhotos';
import resolveJSAProfiles from '@/api/functions/resolveJSAProfiles';

const validateWrestler = (wrestler, index) => {
  const errors = [];
  
  // Required fields (STRICT)
  if (!wrestler.rid || typeof wrestler.rid !== 'string') {
    errors.push(`Record ${index}: missing or invalid 'rid' (must be string)`);
  }
  
  if (!wrestler.shikona || typeof wrestler.shikona !== 'string') {
    errors.push(`Record ${index}: missing or invalid 'shikona' (must be string)`);
  }
  
  if (!wrestler.current_rank || typeof wrestler.current_rank !== 'string') {
    errors.push(`Record ${index}: missing or invalid 'current_rank' (must be string)`);
  }
  
  // Type validations
  if (wrestler.shikona !== undefined && typeof wrestler.shikona !== 'string') {
    errors.push(`Record ${index}: 'shikona' must be string`);
  }
  
  if (wrestler.real_name !== undefined && typeof wrestler.real_name !== 'string') {
    errors.push(`Record ${index}: 'real_name' must be string`);
  }
  
  if (wrestler.status_is_active !== undefined && typeof wrestler.status_is_active !== 'boolean') {
    errors.push(`Record ${index}: 'status_is_active' must be boolean`);
  }
  
  if (wrestler.status_is_retired !== undefined && typeof wrestler.status_is_retired !== 'boolean') {
    errors.push(`Record ${index}: 'status_is_retired' must be boolean`);
  }
  
  if (wrestler.current_rank_number !== undefined && typeof wrestler.current_rank_number !== 'number') {
    errors.push(`Record ${index}: 'current_rank_number' must be number`);
  }
  
  // URL validation
  if (wrestler.official_image_url && typeof wrestler.official_image_url === 'string') {
    try {
      new URL(wrestler.official_image_url);
    } catch {
      errors.push(`Record ${index}: 'official_image_url' is not a valid URL`);
    }
  }
  
  // Logical consistency
  if (wrestler.status_is_active && wrestler.status_is_retired) {
    errors.push(`Record ${index}: wrestler cannot be both active and retired`);
  }
  
  return errors;
};

const validateBashoRecord = (record, index) => {
  const errors = [];
  
  // Required fields
  if (!record.record_id || typeof record.record_id !== 'string') {
    errors.push(`Record ${index}: missing or invalid 'record_id' (must be string)`);
  }
  
  if (!record.rid || typeof record.rid !== 'string') {
    errors.push(`Record ${index}: missing or invalid 'rid' (must be string)`);
  }
  
  // Type validations for numbers
  const numericFields = ['division_code', 'rank_code', 'rank_number', 'wins', 'losses', 'absences', 'win_pct'];
  numericFields.forEach(field => {
    if (record[field] !== undefined && typeof record[field] !== 'number') {
      errors.push(`Record ${index}: '${field}' must be number`);
    }
  });
  
  // Non-negative validations
  ['wins', 'losses', 'absences'].forEach(field => {
    if (record[field] !== undefined && record[field] < 0) {
      errors.push(`Record ${index}: '${field}' cannot be negative`);
    }
  });
  
  // Win percentage validation
  if (record.win_pct !== undefined) {
    if (record.win_pct < 0 || record.win_pct > 1) {
      errors.push(`Record ${index}: 'win_pct' must be between 0 and 1`);
    }
    
    // Validate calculated win_pct matches actual wins/losses
    if (record.wins !== undefined && record.losses !== undefined) {
      const totalMatches = record.wins + record.losses;
      if (totalMatches > 0) {
        const calculatedPct = record.wins / totalMatches;
        const diff = Math.abs(calculatedPct - record.win_pct);
        if (diff > 0.01) {
          errors.push(`Record ${index}: 'win_pct' (${record.win_pct}) doesn't match calculated value (${calculatedPct.toFixed(3)})`);
        }
      }
    }
  }
  
  return errors;
};

export default function DataImport() {
  const [jsonInput, setJsonInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [collectingMatches, setCollectingMatches] = useState(false);
  const [fetchingPhotos, setFetchingPhotos] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [issueDescription, setIssueDescription] = useState('');
  const [suggestedCorrection, setSuggestedCorrection] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(() => {
    const stored = localStorage.getItem('import_entity');
    return stored || 'Wrestler';
  });
  const [importMode, setImportMode] = useState('create'); // 'create' or 'upsert'
  const [exporting, setExporting] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState([]);
  const [dryRun, setDryRun] = useState(false);
  const [healthChecking, setHealthChecking] = useState(false);
  const [healthReport, setHealthReport] = useState(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillReport, setBackfillReport] = useState(null);
  const [fixingRecords, setFixingRecords] = useState(false);
  const [fixRecordsReport, setFixRecordsReport] = useState(null);
  const [resolvingJSA, setResolvingJSA] = useState(false);
  const [jsaReport, setJsaReport] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => api.auth.me(),
  });

  const isAdmin = user?.role === 'admin';

  // Persist selected entity
  React.useEffect(() => {
    localStorage.setItem('import_entity', selectedEntity);
  }, [selectedEntity]);

  const deriveRankFromBashoRecord = (record) => {
    // Priority 1: Use rank directly if available
    if (record.rank) return record.rank;
    
    // Priority 2: Map from division string
    if (record.division) {
      const divisionMap = {
        'Makuuchi': 'Maegashira',
        'Juryo': 'Juryo',
        'Makushita': 'Makushita',
        'Sandanme': 'Sandanme',
        'Jonidan': 'Jonidan',
        'Jonokuchi': 'Jonokuchi'
      };
      if (divisionMap[record.division]) return divisionMap[record.division];
    }
    
    // Priority 3: Map from division_code
    if (record.division_code) {
      const codeMap = {
        1: 'Maegashira',
        2: 'Juryo',
        3: 'Makushita',
        4: 'Sandanme',
        5: 'Jonidan',
        6: 'Jonokuchi'
      };
      if (codeMap[record.division_code]) return codeMap[record.division_code];
    }
    
    return null;
  };

  const handleFixMissingBashoRecords = async () => {
    setFixingRecords(true);
    setFixRecordsReport(null);
    setError(null);

    try {
      // Fetch all wrestlers and basho records
      const allWrestlers = await api.entities.Wrestler.list('-created_date', 5000);
      const allRecords = await api.entities.BashoRecord.list('-created_date', 10000);

      // Build set of rids with records
      const ridsWithRecords = new Set(allRecords.map(r => r.rid));

      // Find wrestlers missing basho records
      const missingWrestlers = allWrestlers.filter(w => !ridsWithRecords.has(w.rid));

      if (missingWrestlers.length === 0) {
        setFixRecordsReport({
          missingCount: 0,
          createdCount: 0,
          affectedRids: []
        });
        toast.info('No missing basho records found');
        return;
      }

      const report = {
        missingCount: missingWrestlers.length,
        createdCount: 0,
        affectedRids: missingWrestlers.map(w => w.rid).slice(0, 50)
      };

      setFixRecordsReport(report);
      toast.error('Missing BashoRecords detected. Import real records instead of auto-generating placeholders.');
    } catch (err) {
      setError(`Fix records failed: ${err.message}`);
      console.error('Fix records error:', err);
    } finally {
      setFixingRecords(false);
    }
  };

  const handleBackfillMissingWrestlers = async () => {
    setBackfilling(true);
    setBackfillReport(null);
    setError(null);

    try {
      // Parse pasted JSON
      let records;
      try {
        const parsed = JSON.parse(jsonInput);
        records = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        throw new Error('Invalid JSON format. Please check your input.');
      }

      if (!records.length) {
        throw new Error('No BashoRecord records found in the JSON data.');
      }

      // Extract unique rids from pasted records
      const bashoRids = new Set();
      records.forEach(r => {
        if (r.rid) bashoRids.add(r.rid);
      });

      // Fetch existing wrestlers
      const existingWrestlers = await api.entities.Wrestler.list('-created_date', 5000);
      const existingRids = new Set(existingWrestlers.map(w => w.rid));

      // Identify missing rids
      const missingRids = Array.from(bashoRids).filter(rid => !existingRids.has(rid));

      if (missingRids.length === 0) {
        setBackfillReport({
          missingCount: 0,
          createdCount: 0,
          skippedCount: 0,
          affectedRids: []
        });
        toast.info('No missing wrestlers found. All rids already exist.');
        return;
      }

      const report = {
        missingCount: missingRids.length,
        createdCount: 0,
        skippedCount: 0,
        affectedRids: missingRids.slice(0, 50),
        skippedDetails: []
      };

      setBackfillReport(report);
      toast.error('Missing Wrestlers detected. Import real Wrestler data instead of auto-creating records.');
    } catch (err) {
      setError(`Backfill failed: ${err.message}`);
      console.error('Backfill error:', err);
    } finally {
      setBackfilling(false);
    }
  };

  const handleHealthCheck = async () => {
    setHealthChecking(true);
    setHealthReport(null);
    setError(null);

    try {
      const report = {
        timestamp: new Date().toISOString(),
        wrestlers: {},
        bashoRecords: {},
        referentialIntegrity: {}
      };

      // 1. Check Wrestler duplicates
      const allWrestlers = await api.entities.Wrestler.list('-created_date', 5000);
      const wrestlerRidMap = new Map();
      
      allWrestlers.forEach(w => {
        if (!wrestlerRidMap.has(w.rid)) {
          wrestlerRidMap.set(w.rid, []);
        }
        wrestlerRidMap.get(w.rid).push(w);
      });

      const duplicateWrestlers = Array.from(wrestlerRidMap.entries())
        .filter(([_, records]) => records.length > 1);

      report.wrestlers.total = allWrestlers.length;
      report.wrestlers.duplicateCount = duplicateWrestlers.length;
      report.wrestlers.duplicateKeys = duplicateWrestlers.map(([rid]) => rid);

      // Delete duplicate wrestlers (keep earliest)
      let deletedWrestlers = 0;
      for (const [rid, records] of duplicateWrestlers) {
        // Sort by created_date, keep first
        const sorted = records.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        for (let i = 1; i < sorted.length; i++) {
          await api.entities.Wrestler.delete(sorted[i].id);
          deletedWrestlers++;
        }
      }
      report.wrestlers.deleted = deletedWrestlers;

      // 2. Check BashoRecord duplicates
      const allBashoRecords = await api.entities.BashoRecord.list('-created_date', 10000);
      const recordIdMap = new Map();
      
      allBashoRecords.forEach(r => {
        if (!recordIdMap.has(r.record_id)) {
          recordIdMap.set(r.record_id, []);
        }
        recordIdMap.get(r.record_id).push(r);
      });

      const duplicateRecords = Array.from(recordIdMap.entries())
        .filter(([_, records]) => records.length > 1);

      report.bashoRecords.total = allBashoRecords.length;
      report.bashoRecords.duplicateCount = duplicateRecords.length;
      report.bashoRecords.duplicateKeys = duplicateRecords.map(([record_id]) => record_id);

      // Delete duplicate basho records (keep earliest)
      let deletedRecords = 0;
      for (const [record_id, records] of duplicateRecords) {
        const sorted = records.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        for (let i = 1; i < sorted.length; i++) {
          await api.entities.BashoRecord.delete(sorted[i].id);
          deletedRecords++;
        }
      }
      report.bashoRecords.deleted = deletedRecords;

      // 3. Check referential integrity
      const validRids = new Set(allWrestlers.map(w => w.rid));
      const brokenRecords = allBashoRecords.filter(r => !validRids.has(r.rid));
      
      report.referentialIntegrity.brokenCount = brokenRecords.length;
      report.referentialIntegrity.missingRids = [...new Set(brokenRecords.map(r => r.rid))].slice(0, 30);

      setHealthReport(report);
      toast.success('Database health check completed');
    } catch (err) {
      setError(`Health check failed: ${err.message}`);
      console.error('Health check error:', err);
    } finally {
      setHealthChecking(false);
    }
  };

  const handleAutoCollect = async () => {
    setCollecting(true);
    setError(null);
    setResult(null);

    try {
      const data = await fetchRealSumoData();
      
      if (!data.success) {
        setError(data.error);
        return;
      }

      // Clear existing wrestlers and import fresh data
      const existing = await api.entities.Wrestler.list('-created_date', 500);
      if (existing.length > 0) {
        for (const wrestler of existing) {
          await api.entities.Wrestler.delete(wrestler.id);
        }
      }

      // Import real wrestlers
      await api.entities.Wrestler.bulkCreate(data.wrestlers);
      
      setResult({
        type: 'collection',
        message: `Successfully imported ${data.count} REAL wrestlers from ${data.source}`,
        count: data.count
      });
    } catch (err) {
      setError(err.message || 'Failed to fetch real wrestler data');
    } finally {
      setCollecting(false);
    }
  };

  const handleGenerateMatches = async () => {
    setCollectingMatches(true);
    setError(null);
    setResult(null);

    try {
      const data = await fetchRealMatchHistory();
      
      if (!data.success) {
        setError(data.error);
        return;
      }

      // Clear existing matches
      const existing = await api.entities.Match.list('-created_date', 500);
      if (existing.length > 0) {
        for (const match of existing) {
          await api.entities.Match.delete(match.id);
        }
      }

      // Import real matches
      if (data.matches && data.matches.length > 0) {
        // Get tournaments to match IDs
        const tournaments = await api.entities.Tournament.list('-start_date', 100);
        
        // Add tournament IDs to matches
        const matchesWithIds = data.matches.map(match => ({
          ...match,
          tournament_id: tournaments.find(t => match.tournament_name?.includes(t.basho))?.id || tournaments[0]?.id || 'unknown',
          wrestler1_id: match.wrestler1_name,
          wrestler2_id: match.wrestler2_name,
          winner_id: match.winner_name
        }));
        
        await api.entities.Match.bulkCreate(matchesWithIds);
        
        setResult({
          type: 'matches',
          message: `Successfully imported ${data.count} REAL matches from ${data.source}`,
          count: data.count
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch real match history');
    } finally {
      setCollectingMatches(false);
    }
  };

  const handleResolveJSAProfiles = async () => {
    setResolvingJSA(true);
    setJsaReport(null);
    setError(null);

    try {
      const result = await resolveJSAProfiles({ batchSize: 5, delayMs: 2000 });
      
      if (result.success) {
        setJsaReport(result);
        toast.success(result.message);
      } else {
        setError(result.error || 'JSA profile resolution failed');
      }
    } catch (err) {
      setError(`JSA resolution failed: ${err.message}`);
      console.error('JSA resolution error:', err);
    } finally {
      setResolvingJSA(false);
    }
  };

  const handleFetchPhotos = async () => {
    setFetchingPhotos(true);
    setError(null);
    setResult(null);

    try {
      const photoData = await fetchWrestlerPhotos();
      
      if (!photoData.success) {
        setError(photoData.error);
        return;
      }

      // Update existing wrestlers with photos
      const wrestlers = await api.entities.Wrestler.list('-created_date', 500);
      let updatedCount = 0;

      for (const photoWrestler of photoData.wrestlers) {
        const matchingWrestler = wrestlers.find(w => 
          w.shikona?.toLowerCase() === photoWrestler.shikona?.toLowerCase()
        );
        
        if (matchingWrestler) {
          await api.entities.Wrestler.update(matchingWrestler.id, {
            image_url: photoWrestler.image_url
          });
          updatedCount++;
        }
      }

      setResult({
        type: 'photos',
        message: `Successfully added ${updatedCount} verified profile photos from official sources!`,
        count: updatedCount
      });
    } catch (err) {
      setError(err.message || 'Failed to fetch wrestler photos');
    } finally {
      setFetchingPhotos(false);
    }
  };

  const handleExport = async (entityType) => {
    setExporting(true);
    try {
      let data;
      if (entityType === 'Wrestler') {
        data = await api.entities.Wrestler.list('-created_date', 5000);
      } else if (entityType === 'BashoRecord') {
        data = await api.entities.BashoRecord.list('-created_date', 10000);
      }

      // Create downloadable JSON
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entityType}_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${data.length} ${entityType} records`);
    } catch (err) {
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    setResult(null);
    setValidationWarnings([]);

    try {
      let records;
      try {
        const parsed = JSON.parse(jsonInput);
        records = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        throw new Error('Invalid JSON format. Please check your input.');
      }

      if (!records.length) {
        throw new Error(`No ${selectedEntity} records found in the JSON data.`);
      }

      // Comprehensive validation
      const allErrors = [];
      
      if (selectedEntity === 'Wrestler') {
        // Check for duplicate rids within the batch
        const ridSet = new Set();
        const batchDuplicates = [];

        records.forEach((record, idx) => {
          const errors = validateWrestler(record, idx);
          allErrors.push(...errors);

          if (record.rid) {
            if (ridSet.has(record.rid)) {
              batchDuplicates.push(record.rid);
            }
            ridSet.add(record.rid);
          }
        });

        if (batchDuplicates.length > 0) {
          throw new Error(`DUPLICATE rid IN BATCH — IMPORT ABORTED\n\nDuplicates: ${batchDuplicates.join(', ')}`);
        }

        if (allErrors.length > 0) {
          throw new Error(`VALIDATION FAILED — IMPORT ABORTED\n\n${allErrors.slice(0, 10).join('\n')}${allErrors.length > 10 ? `\n...and ${allErrors.length - 10} more errors` : ''}`);
        }

        // Fetch existing wrestlers
        const existingWrestlers = await api.entities.Wrestler.list('-created_date', 5000);
        const existingRidsMap = new Map(existingWrestlers.map(w => [w.rid, w]));

        if (importMode === 'create') {
          // CREATE MODE: skip existing rids
          const toCreate = records.filter(r => !existingRidsMap.has(r.rid));
          const skippedDuplicates = records.filter(r => existingRidsMap.has(r.rid)).map(r => r.rid);

          // DRY RUN MODE
          if (dryRun) {
            setResult({
              type: 'dry-run',
              entity: 'Wrestler',
              message: `✓ Validation passed for ${records.length} Wrestlers (DRY RUN)`,
              count: records.length,
              toCreate: toCreate.length,
              skippedDuplicates: skippedDuplicates.length
            });
            return;
          }

          // Bulk import only new wrestlers
          let createdCount = 0;
          if (toCreate.length > 0) {
            await api.entities.Wrestler.bulkCreate(toCreate);
            createdCount = toCreate.length;
          }

          setResult({
            type: 'import',
            entity: 'Wrestler',
            message: `Imported ${createdCount} Wrestlers, skipped ${skippedDuplicates.length} duplicates`,
            count: records.length,
            createdCount,
            skippedDuplicates: skippedDuplicates.length,
            skippedRids: skippedDuplicates.slice(0, 50)
          });
        } else {
          // UPSERT MODE: update existing, create new
          let createdCount = 0;
          let updatedCount = 0;
          let skippedCount = 0;
          let failedCount = 0;
          const failures = [];

          for (const record of records) {
            try {
              const existing = existingRidsMap.get(record.rid);
              if (existing) {
                // Update existing (merge fields)
                await api.entities.Wrestler.update(existing.id, record);
                updatedCount++;
              } else {
                // Create new
                await api.entities.Wrestler.create(record);
                createdCount++;
              }
            } catch (err) {
              failedCount++;
              failures.push({ rid: record.rid, reason: err.message });
            }
          }

          setResult({
            type: 'upsert',
            entity: 'Wrestler',
            message: `Upsert complete: ${createdCount} created, ${updatedCount} updated, ${failedCount} failed`,
            count: records.length,
            createdCount,
            updatedCount,
            failedCount,
            failures: failures.slice(0, 50)
          });
        }
      } else if (selectedEntity === 'BashoRecord') {
        // Check for duplicate record_ids within the batch
        const recordIdSet = new Set();
        const batchDuplicates = [];

        records.forEach((record, idx) => {
          const errors = validateBashoRecord(record, idx);
          allErrors.push(...errors);

          if (record.record_id) {
            if (recordIdSet.has(record.record_id)) {
              batchDuplicates.push(record.record_id);
            }
            recordIdSet.add(record.record_id);
          }
        });

        if (batchDuplicates.length > 0) {
          throw new Error(`DUPLICATE record_id IN BATCH — IMPORT ABORTED\n\nDuplicates: ${batchDuplicates.join(', ')}`);
        }

        if (allErrors.length > 0) {
          throw new Error(`VALIDATION FAILED — IMPORT ABORTED\n\n${allErrors.slice(0, 10).join('\n')}${allErrors.length > 10 ? `\n...and ${allErrors.length - 10} more errors` : ''}`);
        }

        // Fetch existing records and wrestlers
        const existingRecords = await api.entities.BashoRecord.list('-created_date', 10000);
        const existingRecordIds = new Set(existingRecords.map(r => r.record_id));

        const existingWrestlers = await api.entities.Wrestler.list('-created_date', 5000);
        const validRids = new Set(existingWrestlers.map(w => w.rid));

        // Filter out duplicates and check FKs
        const toCreate = records.filter(r => !existingRecordIds.has(r.record_id));
        const skippedDuplicates = records.filter(r => existingRecordIds.has(r.record_id)).map(r => r.record_id);

        const brokenFKs = toCreate.filter(r => !validRids.has(r.rid)).map(r => r.rid);

        if (brokenFKs.length > 0) {
          throw new Error(`BROKEN FOREIGN KEYS — IMPORT ABORTED\n\nrids not found in Wrestler: ${[...new Set(brokenFKs)].slice(0, 10).join(', ')}${brokenFKs.length > 10 ? ` (+${brokenFKs.length - 10} more)` : ''}`);
        }

        // DRY RUN MODE
        if (dryRun) {
          setResult({
            type: 'dry-run',
            entity: 'BashoRecord',
            message: `✓ Validation passed for ${records.length} BashoRecords (DRY RUN)`,
            count: records.length,
            toCreate: toCreate.length,
            skippedDuplicates: skippedDuplicates.length
          });
          return;
        }

        // Bulk import only new basho records
        let createdCount = 0;
        if (toCreate.length > 0) {
          await api.entities.BashoRecord.bulkCreate(toCreate);
          createdCount = toCreate.length;
        }

        setResult({
          type: 'import',
          entity: 'BashoRecord',
          message: `Imported ${createdCount} BashoRecords, skipped ${skippedDuplicates.length} duplicates`,
          count: records.length,
          createdCount,
          skippedDuplicates: skippedDuplicates.length,
          skippedRecordIds: skippedDuplicates.slice(0, 50)
        });
      }

      if (!dryRun) {
        setJsonInput('');
      }
    } catch (err) {
      setError(`${selectedEntity} import failed:\n\n${err.message || 'Unknown error'}`);
    } finally {
      setImporting(false);
    }
  };

  const handleSubmitCorrection = async () => {
    if (!issueDescription.trim()) {
      toast.error('Please describe the issue');
      return;
    }

    setSubmitting(true);
    try {
      await api.entities.DataCorrectionRequest.create({
        issue_description: issueDescription,
        suggested_correction: suggestedCorrection || null
      });

      toast.success('Thank you! We\'ll review your correction request.');
      setIssueDescription('');
      setSuggestedCorrection('');
    } catch (err) {
      console.error('Correction request error:', err);
      toast.error(err?.message?.includes('preview') 
        ? 'Preview mode limitation - test in production' 
        : 'Failed to submit correction request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to={createPageUrl('Leaderboard')}
            className="text-indigo-600 hover:text-indigo-700 font-medium mb-4 inline-block"
          >
            ← Back to Leaderboard
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {isAdmin ? 'Import Wrestler Data' : 'Report Data Issues'}
          </h1>
          <p className="text-slate-600">
            {isAdmin 
              ? 'Collect live data from authoritative sources or paste JSON manually'
              : 'Help us improve the accuracy of wrestler information'
            }
          </p>
        </div>

        {/* Non-admin: Data Correction Request */}
        {!isAdmin && (
          <>
            <Card className="mb-6 border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  See Something Wrong?
                </CardTitle>
                <CardDescription>
                  This website is a small project, and while we approach it with unwavering appreciation for the truth, we get it wrong sometimes. 
                  Please help us correct any inaccuracies you notice.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    What's incorrect?
                  </label>
                  <Textarea
                    placeholder="Describe the issue (e.g., 'Onosato's weight is listed as 150kg but should be 175kg')"
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Suggested correction (optional)
                  </label>
                  <Textarea
                    placeholder="If you know the correct information, please share it here"
                    value={suggestedCorrection}
                    onChange={(e) => setSuggestedCorrection(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>

                <Button
                  onClick={handleSubmitCorrection}
                  disabled={submitting || !issueDescription.trim()}
                  size="lg"
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Correction Request'
                  )}
                </Button>
              </CardContent>
            </Card>

            <Alert className="border-slate-200 bg-slate-50">
              <ShieldAlert className="w-5 h-5 text-slate-600" />
              <AlertDescription className="text-slate-700">
                <div className="font-semibold mb-1">Data Import is Admin-Only</div>
                <div className="text-sm">
                  Direct data import requires administrator privileges. If you need to make significant updates, 
                  please submit a correction request above and our team will review it.
                </div>
              </AlertDescription>
            </Alert>
          </>
        )}

        {/* Admin-only: Database Health Check */}
        {isAdmin && (
          <Card className="mb-6 border-2 border-red-200 bg-gradient-to-br from-red-50 to-pink-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                Database Health Check
              </CardTitle>
              <CardDescription>
                Verify uniqueness constraints, detect duplicates, check referential integrity, and auto-cleanup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleHealthCheck}
                disabled={healthChecking || collecting || collectingMatches || fetchingPhotos}
                size="lg"
                className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
              >
                {healthChecking ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Running health check...
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-5 h-5 mr-2" />
                    Run Database Health Check
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Admin-only: Auto-collect Cards */}
        {isAdmin && (
          <>
          <Card className="mb-6 border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Import Real Wrestler Data
            </CardTitle>
            <CardDescription>
              Fetch real data from SumoDB, Sumo-API, Wikipedia & JSA official sources with verified stats and photos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleAutoCollect}
              disabled={collecting || collectingMatches || fetchingPhotos}
              size="lg"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              {collecting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Fetching real data...
                </>
              ) : (
                <>
                  <Database className="w-5 h-5 mr-2" />
                  Import Real Wrestlers
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="mb-6 border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              Import Real Match History
            </CardTitle>
            <CardDescription>
              Fetch verified historical match data from SumoDB and Sumo-API with real results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleGenerateMatches}
              disabled={collecting || collectingMatches || fetchingPhotos}
              size="lg"
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
            >
              {collectingMatches ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Fetching real matches...
                </>
              ) : (
                <>
                  <Database className="w-5 h-5 mr-2" />
                  Import Real Matches
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="mb-6 border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-600" />
              Add Verified Profile Photos
            </CardTitle>
            <CardDescription>
              Fetch official wrestler portraits from JSA, Wikipedia, and verified sources (100% valid URLs)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleFetchPhotos}
              disabled={collecting || collectingMatches || fetchingPhotos || resolvingJSA}
              size="lg"
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {fetchingPhotos ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Fetching verified photos...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Add Profile Photos
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="mb-6 border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-600" />
              Resolve JSA Profile IDs
            </CardTitle>
            <CardDescription>
              Search sumo.or.jp for official profiles and extract photo URLs (batched with rate limiting)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleResolveJSAProfiles}
              disabled={collecting || collectingMatches || fetchingPhotos || resolvingJSA}
              size="lg"
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
            >
              {resolvingJSA ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Resolving JSA profiles...
                </>
              ) : (
                <>
                  <Database className="w-5 h-5 mr-2" />
                  Resolve JSA Profiles
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Fix Missing Basho Records */}
        <Card className="mb-6 border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-teal-600" />
              Fix Missing Basho Records
            </CardTitle>
            <CardDescription>
              Detect wrestlers with zero basho records and report missing rids
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleFixMissingBashoRecords}
              disabled={fixingRecords || collecting || collectingMatches || fetchingPhotos}
              size="lg"
              className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
            >
              {fixingRecords ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Checking missing records...
                </>
              ) : (
                <>
                  <Database className="w-5 h-5 mr-2" />
                  Fix Missing Basho Records
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Backfill Missing Wrestlers */}
        {selectedEntity === 'BashoRecord' && (
          <Card className="mb-6 border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-orange-600" />
                Backfill Missing Wrestlers
              </CardTitle>
              <CardDescription>
                Detect missing rids referenced by pasted BashoRecord JSON
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleBackfillMissingWrestlers}
                disabled={!jsonInput.trim() || backfilling || collecting || collectingMatches || fetchingPhotos}
                size="lg"
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
              >
                {backfilling ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Backfilling wrestlers...
                  </>
                ) : (
                  <>
                    <Database className="w-5 h-5 mr-2" />
                    Backfill Missing Wrestlers from Pasted Basho JSON
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
        </>
        )}

        {/* Admin-only: Manual Import Card */}
        {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Manual JSON Import
            </CardTitle>
            <CardDescription>
              Select entity type and paste JSON array
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Target Entity
                </label>
                <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Wrestler">Wrestler</SelectItem>
                    <SelectItem value="BashoRecord">BashoRecord</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedEntity === 'Wrestler' && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Import Mode
                  </label>
                  <Select value={importMode} onValueChange={setImportMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="create">Create Only (skip duplicates)</SelectItem>
                      <SelectItem value="upsert">Upsert (update by rid)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Textarea
              placeholder={
                selectedEntity === 'Wrestler'
                ? '[{"rid": "...", "shikona": "...", "current_rank": "...", ...}, ...]'
                : '[{"record_id": "...", "rid": "...", "basho": "...", ...}, ...]'
              }
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />

            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded">
              <input
                type="checkbox"
                id="dryRun"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="dryRun" className="text-sm text-blue-900 font-medium cursor-pointer">
                Dry Run (Validate Only - Don't Import)
              </label>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleImport}
                disabled={importing || !jsonInput.trim() || collecting}
                size="lg"
                className="flex-1"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {dryRun ? 'Validating...' : importMode === 'upsert' ? 'Upserting...' : `Importing ${selectedEntity}...`}
                  </>
                ) : (
                  <>
                    <Database className="w-5 h-5 mr-2" />
                    {dryRun ? `Validate ${selectedEntity}` : importMode === 'upsert' ? `Upsert ${selectedEntity}` : `Import ${selectedEntity}`}
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleExport(selectedEntity)}
                disabled={exporting || importing}
                size="lg"
                variant="outline"
              >
                {exporting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Export
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Admin-only: Status Messages */}
        {isAdmin && (
        <>
        {result && (
          <Alert className={`mt-6 ${result.type === 'dry-run' ? 'border-blue-200 bg-blue-50' : result.type === 'upsert' ? 'border-purple-200 bg-purple-50' : 'border-green-200 bg-green-50'}`}>
            <CheckCircle2 className={`w-5 h-5 ${result.type === 'dry-run' ? 'text-blue-600' : result.type === 'upsert' ? 'text-purple-600' : 'text-green-600'}`} />
            <AlertDescription className={result.type === 'dry-run' ? 'text-blue-800' : result.type === 'upsert' ? 'text-purple-800' : 'text-green-800'}>
              <div className="font-semibold">{result.message}</div>
              <div className="text-sm mt-1 space-y-1">
                {result.type === 'dry-run' ? (
                  <>
                    <div>{result.count} {result.entity || 'records'} in batch</div>
                    {result.toCreate !== undefined && (
                      <>
                        <div className="text-green-700 font-medium">• {result.toCreate} will be created</div>
                        <div className="text-yellow-700 font-medium">• {result.skippedDuplicates} already exist (will skip)</div>
                      </>
                    )}
                    <div className="text-xs mt-2 font-medium border-t pt-2">
                      ✓ No batch duplicates<br/>
                      ✓ All required fields present<br/>
                      {result.entity === 'BashoRecord' && '✓ All foreign keys valid'}
                    </div>
                  </>
                ) : result.type === 'upsert' ? (
                  <>
                    <div className="text-green-700 font-bold">✓ Created: {result.createdCount}</div>
                    <div className="text-blue-700 font-bold">↻ Updated: {result.updatedCount}</div>
                    {result.failedCount > 0 && (
                      <>
                        <div className="text-red-700 font-bold">✗ Failed: {result.failedCount}</div>
                        <div className="text-xs mt-2 text-red-800 max-h-24 overflow-auto bg-red-100 p-2 rounded">
                          {result.failures.map((f, idx) => (
                            <div key={idx}>{f.rid}: {f.reason}</div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-green-700 font-bold">✓ Created: {result.createdCount}</div>
                    {result.skippedDuplicates > 0 && (
                      <div className="text-yellow-700 font-bold">⊘ Skipped (already exist): {result.skippedDuplicates}</div>
                    )}
                    {(result.skippedRids?.length > 0 || result.skippedRecordIds?.length > 0) && (
                      <div className="text-xs mt-2 text-yellow-800 max-h-24 overflow-auto bg-yellow-100 p-2 rounded">
                        Skipped: {(result.skippedRids || result.skippedRecordIds).join(', ')}
                      </div>
                    )}
                  </>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mt-6 border-red-200 bg-red-50">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="font-semibold">Validation Error</div>
              <pre className="text-xs mt-2 whitespace-pre-wrap font-mono bg-red-100 p-2 rounded max-h-64 overflow-auto">
                {error}
              </pre>
            </AlertDescription>
          </Alert>
        )}

        {validationWarnings.length > 0 && (
          <Alert className="mt-6 border-yellow-200 bg-yellow-50">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <div className="font-semibold">Validation Warnings</div>
              <ul className="text-xs mt-2 space-y-1">
                {validationWarnings.slice(0, 5).map((warning, idx) => (
                  <li key={idx}>• {warning}</li>
                ))}
                {validationWarnings.length > 5 && (
                  <li>...and {validationWarnings.length - 5} more warnings</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {fixRecordsReport && (
          <Alert className="mt-6 border-teal-200 bg-teal-50">
            <CheckCircle2 className="w-5 h-5 text-teal-600" />
            <AlertDescription className="text-teal-800">
              <div className="font-bold text-lg mb-3">📊 Fix Missing Records Report</div>

              <div className="space-y-3 text-sm">
                <div className="bg-white/50 p-3 rounded border border-teal-200">
                  <div>Wrestlers missing records: <span className="font-mono font-bold text-red-600">{fixRecordsReport.missingCount}</span></div>
                  <div>Records created: <span className="font-mono font-bold text-green-600">{fixRecordsReport.createdCount}</span></div>
                </div>

                {fixRecordsReport.affectedRids.length > 0 && (
                  <div className="bg-white/50 p-3 rounded border border-teal-200">
                    <div className="font-bold mb-2">Affected rids (first 50):</div>
                    <div className="text-xs font-mono text-teal-700 max-h-32 overflow-auto">
                      {fixRecordsReport.affectedRids.join(', ')}
                    </div>
                  </div>
                )}

                {fixRecordsReport.createdCount > 0 && (
                  <div className="text-green-700 font-medium mt-3">
                    ✓ All wrestlers now have basho records
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {backfillReport && (
          <Alert className="mt-6 border-orange-200 bg-orange-50">
            <CheckCircle2 className="w-5 h-5 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <div className="font-bold text-lg mb-3">🔧 Backfill Report</div>

              <div className="space-y-3 text-sm">
                <div className="bg-white/50 p-3 rounded border border-orange-200">
                  <div>Missing rids detected: <span className="font-mono font-bold text-red-600">{backfillReport.missingCount}</span></div>
                  <div>Wrestlers created: <span className="font-mono font-bold text-green-600">{backfillReport.createdCount}</span></div>
                  <div>Skipped (missing data): <span className="font-mono font-bold text-yellow-600">{backfillReport.skippedCount}</span></div>
                </div>

                {backfillReport.affectedRids.length > 0 && (
                  <div className="bg-white/50 p-3 rounded border border-orange-200">
                    <div className="font-bold mb-2">Affected rids (first 50):</div>
                    <div className="text-xs font-mono text-orange-700 max-h-32 overflow-auto">
                      {backfillReport.affectedRids.join(', ')}
                    </div>
                  </div>
                )}

                {backfillReport.skippedDetails && backfillReport.skippedDetails.length > 0 && (
                  <div className="bg-white/50 p-3 rounded border border-orange-200">
                    <div className="font-bold mb-2 text-yellow-700">Skipped (first 20):</div>
                    <div className="text-xs space-y-1">
                      {backfillReport.skippedDetails.map((s, idx) => (
                        <div key={idx}>• {s.rid} - {s.reason}</div>
                      ))}
                    </div>
                  </div>
                )}

                {backfillReport.createdCount > 0 && (
                  <div className="text-green-700 font-medium mt-3">
                    ✓ Ready to import BashoRecords - click "Import to Database" now
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {jsaReport && (
          <Alert className="mt-6 border-cyan-200 bg-cyan-50">
            <CheckCircle2 className="w-5 h-5 text-cyan-600" />
            <AlertDescription className="text-cyan-800">
              <div className="font-bold text-lg mb-3">🔍 JSA Profile Resolution Report</div>

              <div className="space-y-3 text-sm">
                <div className="bg-white/50 p-3 rounded border border-cyan-200">
                  <div>Processed: <span className="font-mono font-bold">{jsaReport.processed}</span></div>
                  <div>Resolved: <span className="font-mono font-bold text-green-600">{jsaReport.resolved}</span></div>
                  <div>Failed: <span className="font-mono font-bold text-red-600">{jsaReport.failed}</span></div>
                  <div>Skipped: <span className="font-mono font-bold text-yellow-600">{jsaReport.skipped}</span></div>
                </div>

                {jsaReport.newPhotos && jsaReport.newPhotos.length > 0 && (
                  <div className="bg-white/50 p-3 rounded border border-cyan-200">
                    <div className="font-bold mb-2">New Photos (first 20):</div>
                    <div className="text-xs space-y-1 max-h-32 overflow-auto">
                      {jsaReport.newPhotos.slice(0, 20).map((p, idx) => (
                        <div key={idx}>{p.shikona} - Profile ID: {p.profileId}</div>
                      ))}
                    </div>
                  </div>
                )}

                {jsaReport.failures && jsaReport.failures.length > 0 && (
                  <div className="bg-white/50 p-3 rounded border border-cyan-200">
                    <div className="font-bold mb-2 text-red-700">Failures (first 20):</div>
                    <div className="text-xs space-y-1 max-h-32 overflow-auto">
                      {jsaReport.failures.slice(0, 20).map((f, idx) => (
                        <div key={idx}>{f.shikona}: {f.error}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {healthReport && (
          <Alert className="mt-6 border-blue-200 bg-blue-50">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="font-bold text-lg mb-3">📊 Database Health Report</div>
              
              <div className="space-y-4 text-sm">
                {/* Wrestlers */}
                <div className="bg-white/50 p-3 rounded border border-blue-200">
                  <div className="font-bold mb-2">🥋 Wrestlers</div>
                  <div>Total Records: <span className="font-mono">{healthReport.wrestlers.total}</span></div>
                  <div>Duplicate rids Found: <span className="font-mono font-bold text-red-600">{healthReport.wrestlers.duplicateCount}</span></div>
                  {healthReport.wrestlers.duplicateCount > 0 && (
                    <>
                      <div>Duplicates Deleted: <span className="font-mono font-bold text-green-600">{healthReport.wrestlers.deleted}</span></div>
                      <div className="text-xs mt-2 text-red-700">
                        Affected rids: {healthReport.wrestlers.duplicateKeys.slice(0, 10).join(', ')}
                        {healthReport.wrestlers.duplicateKeys.length > 10 && ` (+${healthReport.wrestlers.duplicateKeys.length - 10} more)`}
                      </div>
                    </>
                  )}
                  {healthReport.wrestlers.duplicateCount === 0 && (
                    <div className="text-green-700 font-medium">✓ No duplicates detected</div>
                  )}
                </div>

                {/* BashoRecords */}
                <div className="bg-white/50 p-3 rounded border border-blue-200">
                  <div className="font-bold mb-2">📋 BashoRecords</div>
                  <div>Total Records: <span className="font-mono">{healthReport.bashoRecords.total}</span></div>
                  <div>Duplicate record_ids Found: <span className="font-mono font-bold text-red-600">{healthReport.bashoRecords.duplicateCount}</span></div>
                  {healthReport.bashoRecords.duplicateCount > 0 && (
                    <>
                      <div>Duplicates Deleted: <span className="font-mono font-bold text-green-600">{healthReport.bashoRecords.deleted}</span></div>
                      <div className="text-xs mt-2 text-red-700 max-h-32 overflow-auto">
                        Affected record_ids: {healthReport.bashoRecords.duplicateKeys.slice(0, 10).join(', ')}
                        {healthReport.bashoRecords.duplicateKeys.length > 10 && ` (+${healthReport.bashoRecords.duplicateKeys.length - 10} more)`}
                      </div>
                    </>
                  )}
                  {healthReport.bashoRecords.duplicateCount === 0 && (
                    <div className="text-green-700 font-medium">✓ No duplicates detected</div>
                  )}
                </div>

                {/* Referential Integrity */}
                <div className="bg-white/50 p-3 rounded border border-blue-200">
                  <div className="font-bold mb-2">🔗 Referential Integrity</div>
                  <div>Broken Foreign Keys: <span className="font-mono font-bold text-red-600">{healthReport.referentialIntegrity.brokenCount}</span></div>
                  {healthReport.referentialIntegrity.brokenCount > 0 && (
                    <div className="text-xs mt-2 text-red-700 max-h-32 overflow-auto">
                      Missing rids: {healthReport.referentialIntegrity.missingRids.join(', ')}
                      {healthReport.referentialIntegrity.brokenCount > 30 && ` (+${healthReport.referentialIntegrity.brokenCount - 30} more)`}
                    </div>
                  )}
                  {healthReport.referentialIntegrity.brokenCount === 0 && (
                    <div className="text-green-700 font-medium">✓ All foreign keys valid</div>
                  )}
                </div>

                <div className="text-xs text-blue-600 mt-4">
                  Report generated: {new Date(healthReport.timestamp).toLocaleString()}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        </>
        )}

        {/* Admin-only: Schema Reference */}
        {isAdmin && (
        <Card className="mt-6 bg-slate-50">
          <CardHeader>
            <CardTitle className="text-sm">Expected JSON Schema - {selectedEntity}</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedEntity === 'Wrestler' ? (
              <pre className="text-xs text-slate-600 overflow-x-auto">
{`{
  "rid": "string (required, unique)",
  "shikona": "string (required)",
  "real_name": "string",
  "current_rank": "string (required)",
  "status_is_active": "boolean",
  "status_is_retired": "boolean",
  "current_division": "string",
  "current_rank": "string",
  "current_rank_number": "number",
  "current_side": "string",
  "official_image_url": "string"
}`}
              </pre>
            ) : (
              <pre className="text-xs text-slate-600 overflow-x-auto">
{`{
  "record_id": "string (required, unique)",
  "rid": "string (required, FK to Wrestler.rid)",
  "shikona": "string",
  "basho": "string",
  "snapshot_date": "string",
  "division_code": "number",
  "rank_code": "number",
  "side": "string",
  "rank_number": "number",
  "wins": "number",
  "losses": "number",
  "absences": "number",
  "win_pct": "number"
}`}
              </pre>
            )}
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}