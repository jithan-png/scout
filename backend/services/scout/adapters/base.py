"""
Abstract base class for all Scout data source adapters.
Each adapter is responsible for one source type only.
It knows how to translate a UserIntent into raw records from its own source.
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import List

from models.scout_models import RawRecord, SourceType, UserIntent


class BaseAdapter(ABC):
    """Base class for all Scout source adapters."""

    source_type: SourceType  # must be set on every subclass

    @abstractmethod
    async def fetch(self, intent: UserIntent) -> List[RawRecord]:
        """
        Fetch raw records from this source for the given intent.
        Must never raise — return an empty list on error and log the failure.
        """
        ...
