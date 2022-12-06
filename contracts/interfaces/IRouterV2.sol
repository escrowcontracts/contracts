interface IRouterV2 {
  function buy(
    address _from,
    address _token0,
    address _token1, 
    address[] calldata _recipients, 
    uint256[] calldata _amountIns, 
    uint256[] calldata _maxOuts, 
    address _factory, 
    bytes32[] memory data
  ) external returns (uint256);

  function sell(
    address _token0,
    address _token1, 
    address[] calldata _recipients, 
    uint256[] calldata _amountIns,
    address _factory, 
    bool _isPercent,
    bytes32[] memory data
  ) external;
}